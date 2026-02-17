// app/owner-dashboard/vehicles/[id]/edit/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
// Note: useParams returns Record<string, string | string[]> — we normalise id below
import Link from 'next/link';
import {
  Car,
  ArrowLeft,
  Save,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  DollarSign,
  Info,
  Star,
  Trash2,
  ImagePlus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

type VehicleImage = {
  id?: string;
  url: string;
  is_primary: boolean;
  file?: File; // only present for newly added images
};

type VehicleForm = {
  make: string;
  model: string;
  type: string;
  year: string;
  license_plate: string;
  price_per_day: string;
  status: 'available' | 'rented' | 'maintenance' | 'pending_approval';
  location_city: string;
  location_state: string;
};

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

const VEHICLE_TYPES = ['Sedan', 'SUV', 'Truck', 'Van', 'Convertible', 'Coupe', 'Hatchback', 'Wagon', 'Motorcycle', 'Other'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

export default function EditVehiclePage() {
  // useParams can return string | string[] — normalise immediately
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const router = useRouter();

  const [form, setForm] = useState<VehicleForm>({
    make: '',
    model: '',
    type: '',
    year: '',
    license_plate: '',
    price_per_day: '',
    status: 'available',
    location_city: '',
    location_state: '',
  });

  const [images, setImages] = useState<VehicleImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [errors, setErrors] = useState<Partial<VehicleForm>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch existing vehicle ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;

    const fetchVehicle = async () => {
      const storedEmail = localStorage.getItem('user_email');
      if (!storedEmail) {
        router.push('/sign-in');
        return;
      }

      try {
        // Step 1: fetch the vehicle by id only (no owner filter yet)
        const { data: vehicle, error: vehicleErr } = await supabase
          .from('vehicles')
          .select(`
            id, make, model, type, year, license_plate,
            price_per_day, status, location_city, location_state,
            owner_id,
            vehicle_images ( id, url, is_primary )
          `)
          .eq('id', id)
          .single();

        if (vehicleErr) {
          console.error('Vehicle fetch error:', vehicleErr);
          throw new Error(`Vehicle fetch failed: ${vehicleErr.message}`);
        }
        if (!vehicle) throw new Error('Vehicle not found');

        // Step 2: verify ownership — look up the logged-in user
        const { data: owner, error: ownerErr } = await supabase
          .from('users')
          .select('id')
          .eq('email', storedEmail.trim().toLowerCase())
          .single();

        if (ownerErr) {
          console.error('Owner lookup error:', ownerErr);
          throw new Error(`Owner lookup failed: ${ownerErr.message}`);
        }
        if (!owner) throw new Error('Logged-in user not found in users table');

        // Step 3: compare — if vehicle.owner_id doesn't match, deny
        if (vehicle.owner_id !== owner.id) {
          throw new Error('Access denied: you do not own this vehicle');
        }

        setForm({
          make: vehicle.make ?? '',
          model: vehicle.model ?? '',
          type: vehicle.type ?? '',
          year: vehicle.year ? String(vehicle.year) : '',
          license_plate: vehicle.license_plate ?? '',
          price_per_day: vehicle.price_per_day ? String(vehicle.price_per_day) : '',
          status: vehicle.status ?? 'available',
          location_city: vehicle.location_city ?? '',
          location_state: vehicle.location_state ?? '',
        });

        const imgs = Array.isArray(vehicle.vehicle_images)
          ? vehicle.vehicle_images.map((img: any) => ({
              id: img.id,
              url: img.url,
              is_primary: img.is_primary,
            }))
          : [];
        setImages(imgs);
      } catch (err: any) {
        console.error('EditVehiclePage fetch error:', err);
        setSaveStatus('error');
        setSaveMessage(err.message || 'Failed to load vehicle');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [id, router]);

  // ─── Form helpers ─────────────────────────────────────────────────────────
  const set = (field: keyof VehicleForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<VehicleForm> = {};
    if (!form.make.trim()) newErrors.make = 'Make is required';
    if (!form.model.trim()) newErrors.model = 'Model is required';
    if (!form.license_plate.trim()) newErrors.license_plate = 'License plate is required';
    if (!form.price_per_day || Number(form.price_per_day) <= 0)
      newErrors.price_per_day = 'Enter a valid price';
    if (!form.location_city.trim()) newErrors.location_city = 'City is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Image handling ───────────────────────────────────────────────────────
  const handleFiles = useCallback((files: FileList | File[]) => {
    const newImages: VehicleImage[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        url: URL.createObjectURL(file),
        is_primary: false,
        file,
      }));

    setImages((prev) => {
      const combined = [...prev, ...newImages];
      // If no primary set yet, make first image primary
      if (combined.length > 0 && !combined.some((img) => img.is_primary)) {
        combined[0].is_primary = true;
      }
      return combined;
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const img = prev[index];
      // Track DB images for deletion on save
      if (img.id) {
        setDeletedImageIds((ids) => [...ids, img.id!]);
      } else {
        URL.revokeObjectURL(img.url);
      }
      const next = prev.filter((_, i) => i !== index);
      // Ensure a primary always exists
      if (img.is_primary && next.length > 0) {
        next[0].is_primary = true;
      }
      return next;
    });
  };

  const setPrimary = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({ ...img, is_primary: i === index }))
    );
  };

  // ─── Upload helper ────────────────────────────────────────────────────────
  const uploadImage = async (file: File, vehicleId: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `vehicles/${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('vehicles').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('vehicles').getPublicUrl(path);
    return data.publicUrl;
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    setSaveStatus('saving');
    setSaveMessage('');

    try {
      // 1. Update vehicle record
      const { error: updateErr } = await supabase
        .from('vehicles')
        .update({
          make: form.make.trim(),
          model: form.model.trim(),
          type: form.type || null,
          year: form.year ? Number(form.year) : null,
          license_plate: form.license_plate.trim().toUpperCase(),
          price_per_day: Number(form.price_per_day),
          status: form.status,
          location_city: form.location_city.trim() || null,
          location_state: form.location_state.trim() || null,
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // 2. Delete removed images
      if (deletedImageIds.length > 0) {
        const { error: delErr } = await supabase
          .from('vehicle_images')
          .delete()
          .in('id', deletedImageIds);
        if (delErr) throw delErr;
      }

      // 3. Upload new images and upsert all image records
      const imageUpserts: { vehicle_id: string; url: string; is_primary: boolean }[] = [];

      for (const img of images) {
        if (img.file) {
          const url = await uploadImage(img.file, id);
          imageUpserts.push({ vehicle_id: id, url, is_primary: img.is_primary });
        } else if (img.id) {
          // Update is_primary for existing images
          await supabase
            .from('vehicle_images')
            .update({ is_primary: img.is_primary })
            .eq('id', img.id);
        }
      }

      if (imageUpserts.length > 0) {
        const { error: imgErr } = await supabase
          .from('vehicle_images')
          .insert(imageUpserts);
        if (imgErr) throw imgErr;
      }

      setSaveStatus('success');
      setSaveMessage('Vehicle updated successfully!');
      setDeletedImageIds([]);
      setTimeout(() => {
        router.push('/owner-dashboard/vehicles');
      }, 1500);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMessage(err.message || 'Failed to save changes');
    }
  };

  // ─── Field component ─────────────────────────────────────────────────────
  const Field = ({
    label,
    error,
    required,
    children,
  }: {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );

  const inputClass = (field?: keyof VehicleForm) =>
    `w-full px-4 py-2.5 border rounded-lg outline-none transition-colors text-sm
     ${
       field && errors[field]
         ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
         : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
     }`;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 size={20} className="animate-spin" />
          Loading vehicle details…
        </div>
      </div>
    );
  }

  if (saveStatus === 'error' && !form.make) {
    // Fatal load error — vehicle couldn't be fetched at all
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md w-full text-center">
          <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Could not load vehicle</h2>
          <p className="text-sm text-red-600 mb-6 font-mono bg-red-50 rounded-lg px-4 py-3">
            {saveMessage}
          </p>
          <Link
            href="/owner-dashboard/vehicles"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to My Vehicles
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/owner-dashboard/vehicles"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Edit Vehicle</h1>
            <p className="text-slate-600 mt-0.5 text-sm">
              Update your vehicle's details and availability.
            </p>
          </div>
        </div>

        {/* Save banner */}
        {saveStatus === 'success' && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            <CheckCircle2 size={18} />
            {saveMessage}
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <AlertCircle size={18} />
            {saveMessage}
          </div>
        )}

        <div className="space-y-6">

          {/* ── Section: Basic Info ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Car size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Make" error={errors.make} required>
                <input
                  type="text"
                  value={form.make}
                  onChange={set('make')}
                  placeholder="e.g. Toyota"
                  className={inputClass('make')}
                />
              </Field>

              <Field label="Model" error={errors.model} required>
                <input
                  type="text"
                  value={form.model}
                  onChange={set('model')}
                  placeholder="e.g. Camry"
                  className={inputClass('model')}
                />
              </Field>

              <Field label="Type">
                <select value={form.type} onChange={set('type')} className={inputClass()}>
                  <option value="">Select type</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>

              <Field label="Year">
                <select value={form.year} onChange={set('year')} className={inputClass()}>
                  <option value="">Select year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Field>

              <Field label="License Plate" error={errors.license_plate} required>
                <input
                  type="text"
                  value={form.license_plate}
                  onChange={set('license_plate')}
                  placeholder="e.g. ABC-1234"
                  className={inputClass('license_plate')}
                />
              </Field>
            </div>
          </div>

          {/* ── Section: Location & Pricing ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900">Location & Pricing</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="City" error={errors.location_city} required>
                <input
                  type="text"
                  value={form.location_city}
                  onChange={set('location_city')}
                  placeholder="e.g. San Francisco"
                  className={inputClass('location_city')}
                />
              </Field>

              <Field label="State / Province">
                <input
                  type="text"
                  value={form.location_state}
                  onChange={set('location_state')}
                  placeholder="e.g. CA"
                  className={inputClass()}
                />
              </Field>

              <Field label="Price per Day (USD)" error={errors.price_per_day} required>
                <div className="relative">
                  <DollarSign
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price_per_day}
                    onChange={set('price_per_day')}
                    placeholder="0.00"
                    className={`${inputClass('price_per_day')} pl-9`}
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* ── Section: Status ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Info size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900">Availability Status</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  { value: 'available', label: 'Available', color: 'green' },
                  { value: 'rented', label: 'Rented', color: 'blue' },
                  { value: 'maintenance', label: 'Maintenance', color: 'orange' },
                  { value: 'pending_approval', label: 'Pending', color: 'yellow' },
                ] as const
              ).map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, status: value }))}
                  className={`
                    px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all
                    ${
                      form.status === value
                        ? color === 'green'
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : color === 'blue'
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : color === 'orange'
                          ? 'border-orange-500 bg-orange-50 text-orange-800'
                          : 'border-yellow-500 bg-yellow-50 text-yellow-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.status === 'maintenance' && (
              <div className="mt-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                Changing to "Maintenance" may affect active or pending bookings.
              </div>
            )}
          </div>

          {/* ── Section: Photos ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <ImagePlus size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900">Photos</h2>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              Add clear, well-lit photos. Click the star to set a primary (cover) photo.
            </p>

            {/* Image grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={img.url}
                      alt={`Vehicle photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Primary badge */}
                    {img.is_primary && (
                      <div className="absolute top-1.5 left-1.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                        <Star size={9} fill="currentColor" />
                        Primary
                      </div>
                    )}

                    {/* Hover controls */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!img.is_primary && (
                        <button
                          onClick={() => setPrimary(i)}
                          title="Set as primary"
                          className="p-1.5 bg-yellow-400 text-yellow-900 rounded-full hover:bg-yellow-300 transition-colors"
                        >
                          <Star size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => removeImage(i)}
                        title="Remove photo"
                        className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
              `}
            >
              <Upload size={24} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 font-medium">
                Drop photos here or <span className="text-blue-600">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP up to 10 MB each</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          </div>

          {/* ── Action bar ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-6 py-4">
            <Link
              href="/owner-dashboard/vehicles"
              className="w-full sm:w-auto text-center px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>

            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving' || saveStatus === 'success'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle2 size={16} /> Saved!
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}