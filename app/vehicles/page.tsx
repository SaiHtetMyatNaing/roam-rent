'use client'
import { useState, useEffect, JSX } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Heart,
  Users,
  Zap,
  Fuel,
  Bike,
  ChevronDown,
  Gauge,
  Briefcase,
  Loader2,
  AlertCircle,
  Car,
  Wind,
} from "lucide-react";
import { createClient, PostgrestError } from "@supabase/supabase-js";

// ─── Supabase client ────────────────────────────────────────────────────────
// Replace these with your actual Supabase URL and anon key
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Types ───────────────────────────────────────────────────────────────────
type VehicleType = "Car" | "SUV" | "Motorbike" | "Van" | "Luxury";
type FuelType = "Petrol" | "Diesel" | "Electric" | "Hybrid";
type Drivetrain = "FWD" | "RWD" | "AWD" | "4WD";
type VehicleStatus = "available" | "rented" | "maintenance" | "pending_approval";
type SortOption = "recommended" | "price_asc" | "price_desc";

interface VehicleImage {
  url: string;
  is_primary: boolean;
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
  vehicle_images: VehicleImage[];
  vehicle_features: VehicleFeature[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fuelIcon = (fuelType: FuelType): JSX.Element => {
  switch (fuelType) {
    case "Electric":
      return <Zap size={14} />;
    case "Petrol":
    case "Diesel":
      return <Fuel size={14} />;
    case "Hybrid":
      return <Wind size={14} />;
    default:
      return <Fuel size={14} />;
  }
};

const typeIcon = (vehicleType: VehicleType): JSX.Element => {
  switch (vehicleType) {
    case "Motorbike":
      return <Bike size={14} />;
    case "Luxury":
      return <Gauge size={14} />;
    case "Van":
      return <Briefcase size={14} />;
    default:
      return <Car size={14} />;
  }
};

const typeColor = (vehicleType: VehicleType): string => {
  const map: Record<VehicleType, string> = {
    Car: "bg-sky-500/90",
    SUV: "bg-emerald-600/90",
    Motorbike: "bg-orange-500/90",
    Van: "bg-violet-600/90",
    Luxury: "bg-yellow-500/90 text-yellow-900",
  };
  return map[vehicleType] ?? "bg-gray-700/80";
};

const PLACEHOLDER_IMAGES: Record<VehicleType, string> = {
  Car: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=600",
  SUV: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=600",
  Motorbike:
    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=600",
  Van: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&q=80&w=600",
  Luxury:
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=600",
};

const placeholderImage = (type: VehicleType): string =>
  PLACEHOLDER_IMAGES[type] ?? PLACEHOLDER_IMAGES.Car;

// ─── VehicleCard ─────────────────────────────────────────────────────────────
interface VehicleCardProps {
  car: Vehicle;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
}

function VehicleCard({ car, isWishlisted, onToggleWishlist }: VehicleCardProps) {
  const primaryImg =
    car.vehicle_images.find((i) => i.is_primary)?.url ??
    car.vehicle_images[0]?.url ??
    placeholderImage(car.type);

  const features = car.vehicle_features.map((f) => f.name);
  const location = [car.location_city, car.location_state]
    .filter(Boolean)
    .join(", ");

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = placeholderImage(car.type);
  };

  return (
    <div className="group bg-white rounded-[22px] border border-gray-100 overflow-hidden hover:shadow-[0_24px_60px_rgba(37,99,235,0.1)] hover:-translate-y-1 transition-all duration-300">
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        <img
          src={primaryImg}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={handleImgError}
        />
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`${typeColor(
              car.type
            )} text-white text-[10px] font-black px-2.5 py-1 rounded-md tracking-widest uppercase backdrop-blur-sm`}
          >
            {car.type}
          </span>
        </div>
        {/* Wishlist */}
        <button
          onClick={() => onToggleWishlist(car.id)}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all shadow-sm ${
            isWishlisted
              ? "bg-red-500 text-white"
              : "bg-white/90 text-gray-400 hover:text-red-400"
          }`}
        >
          <Heart size={16} className={isWishlisted ? "fill-white" : ""} />
        </button>
        {/* Location overlay */}
        {location && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            <MapPin size={10} />
            {location}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="mb-1">
          <h3 className="text-lg font-bold text-[#0f172a] leading-tight">
            {car.year} {car.make} {car.model}
          </h3>
          {car.color && (
            <p className="text-xs text-gray-400 font-medium capitalize mt-0.5">
              {car.color}
            </p>
          )}
        </div>

        {car.description && (
          <p className="text-xs text-gray-500 leading-relaxed mt-2 mb-3 line-clamp-2">
            {car.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-5 py-3.5 border-y border-gray-50 mb-4 flex-wrap">
          {car.seating_capacity != null && (
            <div className="flex items-center gap-1.5 text-[#475569] text-xs font-semibold">
              <Users size={14} className="text-gray-400" />
              {car.seating_capacity} seats
            </div>
          )}
          {car.fuel_type && (
            <div className="flex items-center gap-1.5 text-[#475569] text-xs font-semibold">
              <span className="text-gray-400">{fuelIcon(car.fuel_type)}</span>
              {car.fuel_type}
            </div>
          )}
          {car.drivetrain && (
            <div className="flex items-center gap-1.5 text-[#475569] text-xs font-semibold">
              <span className="text-gray-400">{typeIcon(car.type)}</span>
              {car.drivetrain}
            </div>
          )}
          {car.top_speed_mph != null && (
            <div className="flex items-center gap-1.5 text-[#475569] text-xs font-semibold">
              <Gauge size={14} className="text-gray-400" />
              {car.top_speed_mph} mph
            </div>
          )}
        </div>

        {/* Feature chips */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {features.slice(0, 3).map((f, i) => (
              <span
                key={i}
                className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-md"
              >
                {f}
              </span>
            ))}
            {features.length > 3 && (
              <span className="bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                +{features.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex justify-between items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#0f172a]">
              ${Number(car.price_per_day).toFixed(0)}
            </span>
            <span className="text-xs font-semibold text-gray-400">/ day</span>
          </div>
          <button className="bg-[#1d4ed8] hover:bg-[#1e3fa0] text-white px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all active:scale-95 shadow-md shadow-blue-500/15">
            Book Now
          </button>
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

  // ── Fetch vehicles ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadVehicles(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("vehicles")
          .select(
            `
            id,
            make,
            model,
            year,
            type,
            color,
            seating_capacity,
            drivetrain,
            fuel_type,
            top_speed_mph,
            range_efficiency,
            description,
            price_per_day,
            location_city,
            location_state,
            status,
            vehicle_images (
              url,
              is_primary
            ),
            vehicle_features (
              name
            )
          `
          )
          .eq("status", "available")
          .order("created_at", { ascending: false })
          .returns<Vehicle[]>();

        if (fetchError) throw fetchError;
        setVehicles(data ?? []);
      } catch (err) {
        const pgErr = err as PostgrestError;
        setError(pgErr?.message ?? "Failed to load vehicles.");
      } finally {
        setLoading(false);
      }
    }

    loadVehicles();
  }, []);

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
        background:
          "radial-gradient(ellipse 80% 40% at 50% -10%, #dbeafe 0%, #f8fafc 60%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Syne:wght@700;800&display=swap"
        rel="stylesheet"
      />

      <div className="max-w-7xl mx-auto px-4 pt-14">
        {/* ── Hero title ──────────────────────────────────────────────── */}
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

        {/* ── Search bar ──────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-3 items-end bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-[0_8px_40px_rgba(37,99,235,0.08)] border border-blue-100 mb-12">
          <div className="w-full lg:flex-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Pick-up Location
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400"
                size={18}
              />
              <input
                type="text"
                defaultValue="San Francisco International Airport"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="w-full lg:w-56">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Pick-up Date
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400"
                size={18}
              />
              <input
                type="text"
                defaultValue="Oct 24 · 10:00 AM"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="w-full lg:w-56">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Drop-off Date
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400"
                size={18}
              />
              <input
                type="text"
                defaultValue="Oct 28 · 10:00 AM"
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <button className="w-full lg:w-auto bg-[#1d4ed8] hover:bg-[#1e3fa0] text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 text-sm tracking-wide">
            <Search size={16} />
            Search
          </button>
        </div>

        {/* ── Filter + Sort ────────────────────────────────────────────── */}
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
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Sort
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-9 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={13}
              />
            </div>
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={40} className="text-blue-500 animate-spin" />
            <p className="text-gray-400 font-medium">
              Loading available vehicles…
            </p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="p-4 bg-red-50 rounded-2xl">
              <AlertCircle size={36} className="text-red-400" />
            </div>
            <p className="text-gray-600 font-semibold">Couldn't load vehicles</p>
            <p className="text-sm text-gray-400 max-w-xs text-center">{error}</p>
          </div>
        )}

        {/* ── Empty ───────────────────────────────────────────────────── */}
        {!loading && !error && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Car size={48} className="text-gray-200" />
            <p className="text-gray-500 font-semibold">No vehicles found</p>
            <p className="text-sm text-gray-400">
              Try a different filter or check back later.
            </p>
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────────────────── */}
        {!loading && !error && displayed.length > 0 && (
          <>
            <p className="text-sm text-gray-400 mb-6 font-medium">
              {displayed.length} vehicle{displayed.length !== 1 ? "s" : ""}{" "}
              available
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {displayed.map((car) => (
                <VehicleCard
                  key={car.id}
                  car={car}
                  isWishlisted={wishlist.has(car.id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}