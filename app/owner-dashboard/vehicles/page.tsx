// app/owner-dashboard/vehicles/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  Plus,
  Search,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Clock,
  Pencil,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type VehicleImage = {
  url: string;
  is_primary: boolean;
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  type?: string | null;
  year?: number | null;
  license_plate: string;
  price_per_day?: number | null;
  status: 'available' | 'rented' | 'maintenance' | 'pending_approval';
  location_city?: string | null;
  location_state?: string | null;
  vehicle_images?: VehicleImage[] | null;
};

export default function MyVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All Vehicles');
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchVehicles = async () => {
      const storedEmail = localStorage.getItem('user_email');
      if (!storedEmail) {
        window.location.href = '/sign-in';
        return;
      }

      try {
        const { data: owner, error: ownerErr } = await supabase
          .from('users')
          .select('id')
          .eq('email', storedEmail.trim().toLowerCase())
          .single();

        if (ownerErr || !owner) throw new Error('User not found');

        const { data, error } = await supabase
          .from('vehicles')
          .select(`
            id,
            make,
            model,
            type,
            year,
            license_plate,
            price_per_day,
            status,
            location_city,
            location_state,
            vehicle_images (
              url,
              is_primary
            )
          `)
          .eq('owner_id', owner.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const normalised = (data ?? []).map((v: any) => ({
          ...v,
          vehicle_images: Array.isArray(v.vehicle_images) ? v.vehicle_images : [],
        })) as Vehicle[];

        setVehicles(normalised);
      } catch (err: any) {
        setError(err.message || 'Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (v.make?.toLowerCase() ?? '').includes(searchLower) ||
      (v.model?.toLowerCase() ?? '').includes(searchLower) ||
      (v.license_plate?.toLowerCase() ?? '').includes(searchLower);

    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'All Vehicles': return true;
      case 'Available':    return v.status === 'available';
      case 'Rented':       return v.status === 'rented';
      case 'Maintenance':  return v.status === 'maintenance';
      case 'Pending':      return v.status === 'pending_approval';
      default:             return true;
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <CheckCircle2 size={14} /> Available
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
            <Wrench size={14} /> Maintenance
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <Clock size={14} /> Pending
          </span>
        );
      case 'rented':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            <Car size={14} /> Rented
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const getBestImageUrl = (images?: VehicleImage[] | null): string | null => {
    if (!images?.length) return null;
    const valid = images.filter((img) => img.url && !brokenImages.has(img.url));
    if (!valid.length) return null;
    const primary = valid.find((img) => img.is_primary);
    return primary?.url ?? valid[0]?.url ?? null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading your vehicles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-red-600 flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Vehicles</h1>
            <p className="text-slate-600 mt-1">
              Manage your fleet, check status, and update details.
            </p>
          </div>
          <Link
            href="/owner-dashboard/add-vehicles"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add New Vehicle
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by make, model or plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {['All Vehicles', 'Available', 'Rented', 'Maintenance', 'Pending'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* No vehicles */}
        {filteredVehicles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Car className="mx-auto text-slate-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No vehicles found</h3>
            <p className="text-slate-600 mb-6">
              {activeTab === 'All Vehicles'
                ? "You haven't added any vehicles yet or none match your search."
                : `No vehicles in "${activeTab}" status match your search.`}
            </p>
            {activeTab === 'All Vehicles' && (
              <Link
                href="/owner-dashboard/add-vehicles"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Add Your First Vehicle
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVehicles.map((vehicle) => {
              const imageUrl = getBestImageUrl(vehicle.vehicle_images);

              return (
                <div
                  key={vehicle.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-48 h-48 relative flex-shrink-0 bg-slate-50">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={() => {
                            setBrokenImages((prev) => new Set(prev).add(imageUrl));
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Car size={48} className="text-slate-300" />
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-lg text-slate-900 truncate">
                            {vehicle.make} {vehicle.model}
                          </h3>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {vehicle.type || '—'} • {vehicle.year || '—'}
                          </p>
                        </div>
                        <div className="flex-shrink-0">{getStatusBadge(vehicle.status)}</div>
                      </div>

                      <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1">
                        <MapPin size={16} className="flex-shrink-0" />
                        <span className="truncate">
                          {vehicle.location_city || 'Unknown'}
                          {vehicle.location_state && `, ${vehicle.location_state}`}
                        </span>
                      </div>

                      <div className="text-sm text-slate-600 mb-4">
                        <span className="font-medium">#{vehicle.license_plate}</span>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                        <div className="text-xl font-bold text-slate-900">
                          {vehicle.price_per_day
                            ? `$${vehicle.price_per_day.toFixed(2)}`
                            : '—'}
                          <span className="text-sm font-normal text-slate-500 ml-1">/ day</span>
                        </div>

                        <Link
                          href={`/owner-dashboard/edit-vehicles/${vehicle.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200 hover:border-blue-200"
                        >
                          <Pencil size={14} />
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}