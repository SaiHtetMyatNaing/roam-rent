'use client'
import { useState, useEffect, useCallback, JSX } from "react";
import {
  Search, MapPin, Calendar, Heart, Users, Zap, Fuel, Bike,
  ChevronDown, Gauge, Briefcase, Loader2, AlertCircle, Car,
  Wind, X, Star, Shield, ChevronLeft, ChevronRight, Sparkles,
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

// ─── Constants ───────────────────────────────────────────────────────────────
const STORAGE_BUCKET = "vehicle-images";

const PLACEHOLDER_IMAGES: Record<VehicleType, string> = {
  Car: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800",
  SUV: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=800",
  Motorbike: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800",
  Van: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&q=80&w=800",
  Luxury: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800",
};

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

function resolveImageUrl(
  rawUrl: string,
  getPublicUrl: (path: string) => string
): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  return getPublicUrl(rawUrl);
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
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70
                  text-white rounded-full p-2.5 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70
                  text-white rounded-full p-2.5 transition-colors"
              >
                <ChevronRight size={20} />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allImgUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`rounded-full transition-all ${i === activeIdx
                      ? "w-6 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/60 hover:bg-white/90"}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`${TYPE_COLORS[car.type]} text-white text-xs font-bold
              px-3 py-1 rounded-md uppercase tracking-wide`}>
              {car.type}
            </span>
            <span className="bg-green-600 text-white text-xs font-bold
              px-3 py-1 rounded-md uppercase tracking-wide">
              Available
            </span>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white
              rounded-full p-2.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-7">
          <div className="flex justify-between items-start gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                {car.year} {car.make} {car.model}
              </h2>
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
                <span className="text-4xl font-bold text-slate-900">
                  ${Number(car.price_per_day).toFixed(0)}
                </span>
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
  const [filterType, setFilterType] = useState<VehicleType | "All">("All");
  const [selectedCar, setSelectedCar] = useState<Vehicle | null>(null);

  const supabase = createClient();

  // ── Helper: resolve storage URL ─────────────────────────────────────────
  const getPublicUrl = useCallback((path: string): string => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }, [supabase]);

  // ── Fetch vehicles ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadVehicles(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("vehicles")
          .select(`
            id, make, model, year, type, color, seating_capacity,
            drivetrain, fuel_type, top_speed_mph, range_efficiency,
            description, price_per_day, location_city, location_state, status,
            vehicle_images ( url, is_primary ),
            vehicle_features ( name )
          `)
          .eq("status", "available")
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        // Resolve each image URL against Supabase Storage
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
  }, [getPublicUrl]);

  // ── Derived state ───────────────────────────────────────────────────────
  const vehicleTypes: Array<VehicleType | "All"> = [
    "All",
    ...Array.from(new Set(vehicles.map((v) => v.type))),
  ];

  const displayed: Vehicle[] = [...vehicles]
    .filter((v) => filterType === "All" || v.type === filterType)
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.price_per_day - b.price_per_day;
      if (sortBy === "price_desc") return b.price_per_day - a.price_per_day;
      return 0;
    });

  const toggleWishlist = (id: string): void => {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-[#1a1a1a] pb-24"
      style={{
        background: "radial-gradient(ellipse 80% 40% at 50% -10%, #dbeafe 0%, #f8fafc 60%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Syne:wght@700;800&display=swap"
        rel="stylesheet"
      />

      <div className="max-w-7xl mx-auto px-4 pt-14">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1
            className="text-5xl font-black tracking-tight text-[#0f172a] mb-3"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Find Your Ride
          </h1>
          <p className="text-gray-500 text-lg font-light">
            Thousands of vehicles, one search away.
          </p>
        </div>

        {/* Search bar */}
        <div className="flex flex-col lg:flex-row gap-3 items-end bg-white/80 backdrop-blur-sm
          p-5 rounded-2xl shadow-[0_8px_40px_rgba(37,99,235,0.08)] border border-blue-100 mb-12">
          <div className="w-full lg:flex-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Pick-up Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
              <input
                type="text"
                defaultValue="San Francisco International Airport"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                  transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="w-full lg:w-56">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Pick-up Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
              <input
                type="text"
                defaultValue="Oct 24 · 10:00 AM"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                  transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="w-full lg:w-56">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Drop-off Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
              <input
                type="text"
                defaultValue="Oct 28 · 10:00 AM"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                  transition-all text-sm font-medium"
              />
            </div>
          </div>

          <button className="w-full lg:w-auto bg-[#1d4ed8] hover:bg-[#1e3fa0] text-white px-8 py-3
            rounded-xl font-bold flex items-center justify-center gap-2 transition-all
            shadow-lg shadow-blue-500/25 text-sm tracking-wide">
            <Search size={16} /> Search
          </button>
        </div>

        {/* Filter + Sort */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {vehicleTypes.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  filterType === t
                    ? "bg-[#1d4ed8] text-white border-[#1d4ed8] shadow-md shadow-blue-400/20"
                    : "bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
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
        {!loading && !error && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Car size={48} className="text-gray-200" />
            <p className="text-gray-500 font-semibold">No vehicles found</p>
            <p className="text-sm text-gray-400">Try a different filter or check back later.</p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && displayed.length > 0 && (
          <>
            <p className="text-sm text-gray-400 mb-6 font-medium">
              {displayed.length} vehicle{displayed.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {displayed.map((car) => (
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