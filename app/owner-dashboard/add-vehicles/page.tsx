// app/owner-dashboard/vehicles/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Upload, DollarSign, MapPin, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const VEHICLE_TYPES = ['Car', 'SUV', 'Motorbike', 'Van', 'Luxury'] as const;
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid'] as const;
const DRIVETRAINS = ['FWD', 'RWD', 'AWD', '4WD'] as const;

export default function AddVehiclePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const [form, setForm] = useState({
    make: '',
    model: '',
    year: '',
    type: '',
    license_plate: '',
    color: '',
    seating_capacity: '',
    drivetrain: '',
    fuel_type: '',
    top_speed_mph: '',
    range_efficiency: '',
    description: '',
    price_per_day: '',
    location_city: '',
    location_state: '',
  });

  // Get current user's ID from users table using stored email
  useEffect(() => {
    const fetchOwnerId = async () => {
      const storedEmail = localStorage.getItem('user_email');
      if (!storedEmail) {
        router.replace('/sign-in');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, role')
          .eq('email', storedEmail.trim().toLowerCase())
          .single();

        if (error || !data) {
          localStorage.removeItem('user_email');
          router.replace('/sign-in');
          return;
        }

        if (data.role !== 'vehicle-owner') {
          router.replace('/unauthorized');
          return;
        }

        setOwnerId(data.id);
      } catch (err) {
        console.error('Failed to verify owner:', err);
        router.replace('/sign-in');
      }
    };

    fetchOwnerId();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Insert vehicle
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          owner_id: ownerId,
          make: form.make.trim(),
          model: form.model.trim(),
          year: parseInt(form.year) || null,
          type: form.type,
          license_plate: form.license_plate.trim().toUpperCase(),
          color: form.color.trim() || null,
          seating_capacity: parseInt(form.seating_capacity) || null,
          drivetrain: form.drivetrain || null,
          fuel_type: form.fuel_type || null,
          top_speed_mph: parseInt(form.top_speed_mph) || null,
          range_efficiency: form.range_efficiency.trim() || null,
          description: form.description.trim() || null,
          price_per_day: parseFloat(form.price_per_day) || null,
          location_city: form.location_city.trim() || null,
          location_state: form.location_state.trim() || null,
          status: 'pending_approval',
        })
        .select()
        .single();

      if (vehicleError || !vehicle) {
        throw vehicleError || new Error('Failed to create vehicle');
      }

      // Upload images
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${vehicle.id}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('vehicles')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('vehicles').getPublicUrl(fileName);

          await supabase.from('vehicle_images').insert({
            vehicle_id: vehicle.id,
            url: urlData.publicUrl,
            is_primary: images.indexOf(file) === 0,
          });
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/owner-dashboard/vehicles');
      }, 1800);

    } catch (err: any) {
      setError(err.message || 'Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Add New Vehicle</h1>
        <p className="text-slate-600 mb-10">Fill in the details to list your vehicle for rent</p>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3 text-red-700">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-10 text-center">
            <CheckCircle2 className="mx-auto text-green-600 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-green-800 mb-3">Vehicle Added!</h2>
            <p className="text-green-700 mb-6">Your vehicle is pending approval. Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-10 bg-white border border-slate-200 rounded-md p-8">
            {/* Basic Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <Car className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-slate-800">Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Make *</label>
                  <input
                    name="make"
                    value={form.make}
                    onChange={handleChange}
                    placeholder="Toyota, Honda, BMW..."
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Model *</label>
                  <input
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                    placeholder="Camry, Civic, X5..."
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year *</label>
                  <input
                    name="year"
                    type="number"
                    value={form.year}
                    onChange={handleChange}
                    placeholder="2020"
                    required
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type *</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  >
                    <option value="">Select type</option>
                    {VEHICLE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Identification & Specs */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <Info className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-slate-800">Identification & Specs</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">License Plate *</label>
                  <input
                    name="license_plate"
                    value={form.license_plate}
                    onChange={handleChange}
                    placeholder="29A-12345"
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                  <input
                    name="color"
                    value={form.color}
                    onChange={handleChange}
                    placeholder="Black, White, Red..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Seating Capacity</label>
                  <input
                    name="seating_capacity"
                    type="number"
                    value={form.seating_capacity}
                    onChange={handleChange}
                    placeholder="5"
                    min="2"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Drivetrain</label>
                  <select
                    name="drivetrain"
                    value={form.drivetrain}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  >
                    <option value="">Select drivetrain</option>
                    {DRIVETRAINS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
                  <select
                    name="fuel_type"
                    value={form.fuel_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                  >
                    <option value="">Select fuel type</option>
                    {FUEL_TYPES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Top Speed (mph)</label>
                  <input
                    name="top_speed_mph"
                    type="number"
                    value={form.top_speed_mph}
                    onChange={handleChange}
                    placeholder="120"
                    min="50"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Range/Efficiency</label>
                  <input
                    name="range_efficiency"
                    value={form.range_efficiency}
                    onChange={handleChange}
                    placeholder="400 km / 5.5 L/100km"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Location */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <DollarSign className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-slate-800">Pricing & Location</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price per Day ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      name="price_per_day"
                      type="number"
                      step="0.01"
                      value={form.price_per_day}
                      onChange={handleChange}
                      placeholder="75.00"
                      required
                      min="1"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      name="location_city"
                      value={form.location_city}
                      onChange={handleChange}
                      placeholder="Ho Chi Minh City"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">State / Province</label>
                  <input
                    name="location_state"
                    value={form.location_state}
                    onChange={handleChange}
                    placeholder="Hanoi or Ho Chi Minh"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <Info className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-slate-800">Description</h2>
              </div>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                placeholder="Describe your vehicle: condition, features, mileage, any special notes..."
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-y"
              />
            </div>

            {/* Images */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <Upload className="text-blue-600" size={24} />
                <h2 className="text-xl font-semibold text-slate-800">Vehicle Images</h2>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-md p-8 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="vehicle-images"
                />
                <label
                  htmlFor="vehicle-images"
                  className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
                >
                  Click to upload images
                </label>
                <p className="text-sm text-slate-500 mt-2">or drag & drop (JPG, PNG)</p>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={src}
                        alt={`preview ${idx}`}
                        className="w-full h-32 object-cover rounded-md border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-8 border-t border-slate-200">
              <button
                type="submit"
                disabled={loading || !ownerId}
                className={`
                  w-full py-3.5 px-6 bg-blue-600 text-white rounded-md font-semibold text-lg
                  transition-all flex items-center justify-center gap-2
                  ${loading || !ownerId ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-[0.98]'}
                `}
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding Vehicle...
                  </>
                ) : (
                  'Add Vehicle for Approval'
                )}
              </button>

              <p className="text-center text-sm text-slate-500 mt-4">
                Your vehicle will be reviewed before going live
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}