'use client'
import { useState, useEffect, useCallback, JSX } from "react";
import {
  Search, MapPin, Calendar, Heart, Users, Zap, Fuel, Bike,
  ChevronDown, Gauge, Briefcase, Loader2, AlertCircle, Car,
  Wind, X, Star, ChevronLeft, ChevronRight, Sparkles,
  SlidersHorizontal, RotateCcw,
} from "lucide-react";
import { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────
type VehicleType = "Car" | "SUV" | "Motorbike" | "Van" | "Luxury";
type FuelType = "Petrol" | "Diesel" | "Electric" | "Hybrid";
type Drivetrain = "FWD" | "RWD" | "AWD" | "4WD";
type VehicleStatus = "available" | "rented" | "maintenance" | "pending_approval";
type SortOption = "recommended" | "price_asc" | "price_desc";

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

// Counts how many filter fields are active (for badge on filter button)
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl
        flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-blue-600" />
            <span className="font-bold text-slate-900 text-lg">Filters</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-blue-600 transition-colors"
            >
              <RotateCcw size={13} /> Reset all
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

          {/* Vehicle Type */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Vehicle Type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => set("type", t)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    filters.type === t
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-400/20"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Price Range */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Price per Day ($)
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Min</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => set("minPrice", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-semibold mb-1 block">Max</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Any"
                  value={filters.maxPrice}
                  onChange={(e) => set("maxPrice", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200
                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
            </div>
          </section>

          {/* Fuel Type */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Fuel Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FUEL_OPTIONS.map((ft) => {
                const active = filters.fuelTypes.includes(ft);
                return (
                  <button
                    key={ft}
                    onClick={() => toggleFuel(ft)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold
                      border transition-all ${
                        active
                          ? "bg-blue-50 text-blue-700 border-blue-300"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-200"
                      }`}
                  >
                    <span className={active ? "text-blue-500" : "text-gray-400"}>
                      {fuelIcon(ft)}
                    </span>
                    {ft}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Drivetrain */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Drivetrain
            </p>
            <div className="grid grid-cols-4 gap-2">
              {DRIVETRAIN_OPTIONS.map((dt) => {
                const active = filters.drivetrains.includes(dt);
                return (
                  <button
                    key={dt}
                    onClick={() => toggleDrive(dt)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {dt}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Min Seats */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Minimum Seats
            </p>
            <div className="flex gap-2">
              {["2", "4", "5", "7", "8"].map((n) => (
                <button
                  key={n}
                  onClick={() => set("minSeats", filters.minSeats === n ? "" : n)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    filters.minSeats === n
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {n}+
                </button>
              ))}
            </div>
          </section>

          {/* Location City */}
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              City
            </p>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={15} />
              <input
                type="text"
                placeholder="e.g. San Francisco"
                value={filters.locationCity}
                onChange={(e) => set("locationCity", e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm font-medium bg-gray-50 border border-gray-200
                  rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold
              text-sm tracking-wide transition-colors shadow-lg shadow-blue-500/20"
          >
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

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = placeholderImage(car.type);
  };

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
          onError={handleImgError}
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
          <p className="text-xs text-gray-600 leading-relaxed mt-2 mb-4 line-clamp-2">
            {car.description}
          </p>
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

// ─── Detail Dialog ────────────────────────────────────────────────────────────
interface DetailDialogProps {
  car: Vehicle;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onClose: () => void;
}

function DetailDialog({ car, isWishlisted, onToggleWishlist, onClose }: DetailDialogProps) {
  const images = car.vehicle_images ?? [];
  const allImgUrls = images.map((i) => i.publicUrl ?? i.url ?? placeholderImage(car.type));
  const [activeIdx, setActiveIdx] = useState(
    Math.max(0, images.findIndex((i) => i.is_primary))
  );
  const features = (car.vehicle_features ?? []).map((f) => f.name);
  const location = [car.location_city, car.location_state].filter(Boolean).join(", ");

  const prev = () => setActiveIdx((i) => (i - 1 + allImgUrls.length) % allImgUrls.length);
  const next = () => setActiveIdx((i) => (i + 1) % allImgUrls.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = placeholderImage(car.type);
  };

  const stats = [
    car.seating_capacity != null && { icon: <Users size={18} />, label: "Seats", value: `${car.seating_capacity}` },
    car.fuel_type && { icon: fuelIcon(car.fuel_type), label: "Fuel", value: car.fuel_type },
    car.drivetrain && { icon: typeIcon(car.type), label: "Drive", value: car.drivetrain },
    car.top_speed_mph != null && { icon: <Gauge size={18} />, label: "Top Speed", value: `${car.top_speed_mph} mph` },
    car.range_efficiency && { icon: <Sparkles size={18} />, label: "Range", value: car.range_efficiency },
  ].filter(Boolean) as { icon: JSX.Element; label: string; value: string }[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto
          shadow-xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-72 sm:h-80 bg-gray-100 rounded-t-2xl overflow-hidden">
          <img
            src={allImgUrls[activeIdx] ?? placeholderImage(car.type)}
            alt={`${car.year} ${car.make} ${car.model}`}
            className="w-full h-full object-cover"
            onError={handleImgError}
          />
          {allImgUrls.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50
                hover:bg-black/70 text-white rounded-full p-2.5 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50
                hover:bg-black/70 text-white rounded-full p-2.5 transition-colors">
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allImgUrls.map((_, i) => (
                  <button key={i} onClick={() => setActiveIdx(i)}
                    className={`rounded-full transition-all ${i === activeIdx
                      ? "w-6 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/60 hover:bg-white/90"}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`${TYPE_COLORS[car.type]} text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide`}>
              {car.type}
            </span>
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide">
              Available
            </span>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 hover:bg-black/70
            text-white rounded-full p-2.5 transition-colors">
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
              className={`p-3 rounded-full border transition-colors ${
                isWishlisted
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
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

          {features.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Features</h3>
              <div className="flex flex-wrap gap-2">
                {features.map((f, i) => (
                  <span key={i} className="bg-blue-50 text-blue-700 text-sm px-3 py-1.5 rounded-lg font-medium">
                    {f}
                  </span>
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
            <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white
              px-10 py-4 rounded-md font-bold text-sm tracking-wide transition-colors">
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Single filters object — source of truth for the Supabase query
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // Staged filters: what's in the panel before "Apply"
  const [stagedFilters, setStagedFilters] = useState<Filters>(DEFAULT_FILTERS);

  const supabase = createClient();

  const getPublicUrl = useCallback((path: string): string => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, [supabase]);

  // ── Fetch – re-runs whenever `filters` or `sortBy` changes ──────────────
  useEffect(() => {
    async function loadVehicles(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        // Start with the base query
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

        // ── Apply filters to the Supabase query ──────────────────────────

        // Vehicle type
        if (filters.type !== "All") {
          query = query.eq("type", filters.type);
        }

        // Fuel types (multi-select → use `.in()`)
        if (filters.fuelTypes.length > 0) {
          query = query.in("fuel_type", filters.fuelTypes);
        }

        // Drivetrains (multi-select → use `.in()`)
        if (filters.drivetrains.length > 0) {
          query = query.in("drivetrain", filters.drivetrains);
        }

        // Price range
        if (filters.minPrice !== "") {
          query = query.gte("price_per_day", Number(filters.minPrice));
        }
        if (filters.maxPrice !== "") {
          query = query.lte("price_per_day", Number(filters.maxPrice));
        }

        // Minimum seats
        if (filters.minSeats !== "") {
          query = query.gte("seating_capacity", Number(filters.minSeats));
        }

        // City (case-insensitive partial match via `ilike`)
        if (filters.locationCity.trim() !== "") {
          query = query.ilike("location_city", `%${filters.locationCity.trim()}%`);
        }

        // ── Sorting ──────────────────────────────────────────────────────
        if (sortBy === "price_asc") {
          query = query.order("price_per_day", { ascending: true });
        } else if (sortBy === "price_desc") {
          query = query.order("price_per_day", { ascending: false });
        } else {
          // "recommended" → newest first
          query = query.order("created_at", { ascending: false });
        }

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

  // Open drawer → copy committed filters into staged
  const openFilters = () => {
    setStagedFilters(filters);
    setShowFilters(true);
  };

  // Apply staged filters → commit & close drawer
  const applyFilters = () => {
    setFilters(stagedFilters);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setStagedFilters(DEFAULT_FILTERS);
  };

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
        {/* Hero */}


        {/* Filter button + Sort */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Filter trigger */}
          <button
            onClick={openFilters}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold
              text-sm border transition-all ${
                activeCount > 0
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-400/20"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }`}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeCount > 0 && (
              <span className="ml-1 bg-white text-blue-700 text-[10px] font-black w-5 h-5
                rounded-full flex items-center justify-center leading-none">
                {activeCount}
              </span>
            )}
          </button>

          {/* Active filter chips (quick-remove) */}
          {activeCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {filters.type !== "All" && (
                <Chip label={filters.type} onRemove={() => setFilters((f) => ({ ...f, type: "All" }))} />
              )}
              {filters.fuelTypes.map((ft) => (
                <Chip key={ft} label={ft} onRemove={() =>
                  setFilters((f) => ({ ...f, fuelTypes: f.fuelTypes.filter((x) => x !== ft) }))} />
              ))}
              {filters.drivetrains.map((dt) => (
                <Chip key={dt} label={dt} onRemove={() =>
                  setFilters((f) => ({ ...f, drivetrains: f.drivetrains.filter((x) => x !== dt) }))} />
              ))}
              {filters.minPrice && (
                <Chip label={`≥ $${filters.minPrice}`} onRemove={() => setFilters((f) => ({ ...f, minPrice: "" }))} />
              )}
              {filters.maxPrice && (
                <Chip label={`≤ $${filters.maxPrice}`} onRemove={() => setFilters((f) => ({ ...f, maxPrice: "" }))} />
              )}
              {filters.minSeats && (
                <Chip label={`${filters.minSeats}+ seats`} onRemove={() => setFilters((f) => ({ ...f, minSeats: "" }))} />
              )}
              {filters.locationCity && (
                <Chip label={filters.locationCity} onRemove={() => setFilters((f) => ({ ...f, locationCity: "" }))} />
              )}
              <button onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-xs text-gray-400 hover:text-red-500 font-semibold underline transition-colors">
                Clear all
              </button>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-9 py-2
                  text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={40} className="text-blue-500 animate-spin" />
            <p className="text-gray-400 font-medium">Loading available vehicles…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="p-4 bg-red-50 rounded-2xl">
              <AlertCircle size={36} className="text-red-400" />
            </div>
            <p className="text-gray-600 font-semibold">Couldn't load vehicles</p>
            <p className="text-sm text-gray-400 max-w-xs text-center">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && vehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Car size={48} className="text-gray-200" />
            <p className="text-gray-500 font-semibold">No vehicles found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or check back later.</p>
            {activeCount > 0 && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-2 text-sm text-blue-600 font-semibold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && vehicles.length > 0 && (
          <>
            <p className="text-sm text-gray-400 mb-6 font-medium">
              {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {vehicles.map((car) => (
                <VehicleCard
                  key={car.id}
                  car={car}
                  isWishlisted={wishlist.has(car.id)}
                  onToggleWishlist={toggleWishlist}
                  onViewDetails={setSelectedCar}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <FilterPanel
          filters={stagedFilters}
          onChange={setStagedFilters}
          onReset={resetFilters}
          onClose={applyFilters}
        />
      )}

      {/* Detail Dialog */}
      {selectedCar && (
        <DetailDialog
          car={selectedCar}
          isWishlisted={wishlist.has(selectedCar.id)}
          onToggleWishlist={toggleWishlist}
          onClose={() => setSelectedCar(null)}
        />
      )}
    </div>
  );
}

// ─── Chip (active filter badge) ───────────────────────────────────────────────
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