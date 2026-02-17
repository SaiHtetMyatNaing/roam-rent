'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Car, Upload, DollarSign, MapPin, Info, AlertCircle,
  CheckCircle2, ChevronRight, ChevronLeft, X, Gauge,
  Fuel, Users, Palette, Hash, ArrowRight, Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const VEHICLE_TYPES = ['Car', 'SUV', 'Motorbike', 'Van', 'Luxury'] as const;
const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid'] as const;
const DRIVETRAINS = ['FWD', 'RWD', 'AWD', '4WD'] as const;

type VehicleType = typeof VEHICLE_TYPES[number];
type FuelType = typeof FUEL_TYPES[number];
type Drivetrain = typeof DRIVETRAINS[number];

interface FormState {
  make: string;
  model: string;
  year: string;
  type: VehicleType | '';
  license_plate: string;
  color: string;
  seating_capacity: string;
  drivetrain: Drivetrain | '';
  fuel_type: FuelType | '';
  top_speed_mph: string;
  range_efficiency: string;
  description: string;
  price_per_day: string;
  location_city: string;
  location_state: string;
}

interface FieldError {
  [key: string]: string;
}

const STEPS = [
  { id: 'basics',   label: 'Basics',   icon: Car },
  { id: 'specs',    label: 'Specs',    icon: Gauge },
  { id: 'pricing',  label: 'Pricing',  icon: DollarSign },
  { id: 'photos',   label: 'Photos',   icon: Upload },
] as const;

type StepId = typeof STEPS[number]['id'];

const INITIAL_FORM: FormState = {
  make: '', model: '', year: '', type: '',
  license_plate: '', color: '', seating_capacity: '',
  drivetrain: '', fuel_type: '', top_speed_mph: '',
  range_efficiency: '', description: '',
  price_per_day: '', location_city: '', location_state: '',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function validate(step: StepId, form: FormState): FieldError {
  const errors: FieldError = {};
  const currentYear = new Date().getFullYear();

  if (step === 'basics') {
    if (!form.make.trim())  errors.make  = 'Make is required';
    if (!form.model.trim()) errors.model = 'Model is required';
    if (!form.year)         errors.year  = 'Year is required';
    else if (parseInt(form.year) < 1900 || parseInt(form.year) > currentYear + 1)
      errors.year = `Year must be between 1900 and ${currentYear + 1}`;
    if (!form.type)         errors.type  = 'Vehicle type is required';
  }

  if (step === 'specs') {
    if (!form.license_plate.trim()) errors.license_plate = 'License plate is required';
    if (form.seating_capacity && parseInt(form.seating_capacity) < 1)
      errors.seating_capacity = 'Must be at least 1';
    if (form.top_speed_mph && parseInt(form.top_speed_mph) < 1)
      errors.top_speed_mph = 'Must be a positive number';
  }

  if (step === 'pricing') {
    if (!form.price_per_day) errors.price_per_day = 'Price is required';
    else if (parseFloat(form.price_per_day) < 1)
      errors.price_per_day = 'Price must be at least $1';
  }

  return errors;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function FieldWrapper({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 flex gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (error?: string) =>
  `w-full px-3.5 py-3 rounded-md border text-sm transition-colors outline-none
   ${error
     ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100'
     : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
   }`;

function TypeChip({ label, selected, onClick }: {
  label: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm font-medium transition-all
        ${selected
          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
    >
      {label}
    </button>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AddVehiclePage() {
  const router = useRouter();

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentStep, setCurrentStep] = useState<StepId>('basics');
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [submitState, setSubmitState] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── auth ──
  useEffect(() => {
    const fetchOwnerId = async () => {
      const storedEmail = localStorage.getItem('user_email');
      if (!storedEmail) { router.replace('/sign-in'); return; }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, role')
          .eq('email', storedEmail.trim().toLowerCase())
          .single();

        if (error || !data || data.role !== 'vehicle-owner') {
          localStorage.removeItem('user_email');
          router.replace(data?.role !== 'vehicle-owner' ? '/unauthorized' : '/sign-in');
          return;
        }
        setOwnerId(data.id);
      } catch {
        router.replace('/sign-in');
      } finally {
        setAuthLoading(false);
      }
    };
    fetchOwnerId();
  }, [router]);

  // ── form ──
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  }, [fieldErrors]);

  const setField = useCallback((name: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  }, [fieldErrors]);

  // ── images ──
  const addImages = useCallback((files: File[]) => {
    const valid = files.filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...valid]);
    valid.forEach(file => {
      const url = URL.createObjectURL(file);
      setImagePreviews(prev => [...prev, url]);
    });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addImages(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addImages(Array.from(e.dataTransfer.files));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ── step nav ──
  const stepOrder: StepId[] = ['basics', 'specs', 'pricing', 'photos'];

  const goToStep = (step: StepId) => {
    const idx = stepOrder.indexOf(step);
    const currentIdx = stepOrder.indexOf(currentStep);
    // Only allow going back or to completed steps
    if (idx < currentIdx || completedSteps.has(step)) {
      setCurrentStep(step);
      setFieldErrors({});
    }
  };

  const handleNext = () => {
    const errors = validate(currentStep, form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    const idx = stepOrder.indexOf(currentStep);
    if (idx < stepOrder.length - 1) {
      setCurrentStep(stepOrder[idx + 1]);
      setFieldErrors({});
    }
  };

  const handleBack = () => {
    const idx = stepOrder.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(stepOrder[idx - 1]);
      setFieldErrors({});
    }
  };

  // ── submit ──
  const handleSubmit = async () => {
    if (!ownerId) return;

    setSubmitState('saving');
    setSubmitError(null);

    try {
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

      if (vehicleError || !vehicle) throw vehicleError ?? new Error('Failed to create vehicle');

      // Upload images with progress
      if (images.length > 0) {
        setSubmitState('uploading');
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const ext = file.name.split('.').pop() ?? 'jpg';
          const fileName = `${vehicle.id}-${Date.now()}-${i}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('vehicles')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('vehicles').getPublicUrl(fileName);

          await supabase.from('vehicle_images').insert({
            vehicle_id: vehicle.id,
            url: urlData.publicUrl,
            is_primary: i === 0,
          });

          setUploadProgress(Math.round(((i + 1) / images.length) * 100));
        }
      }

      setSubmitState('done');
      setTimeout(() => router.push('/owner-dashboard/vehicles'), 2500);

    } catch (err: any) {
      setSubmitError(err.message ?? 'Something went wrong. Please try again.');
      setSubmitState('error');
    }
  };

  // ── derived ──
  const currentStepIndex = stepOrder.indexOf(currentStep);
  const isLastStep = currentStep === 'photos';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (submitState === 'done') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Vehicle Listed!</h2>
          <p className="text-slate-500 text-sm mb-1">
            Your <strong>{form.year} {form.make} {form.model}</strong> has been submitted.
          </p>
          <p className="text-slate-400 text-sm">Our team will review it shortly. Redirecting…</p>
          <div className="mt-6 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 animate-[shrink_2.5s_linear_forwards] rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // ── render ──
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => router.push('/owner-dashboard/vehicles')}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Back to vehicles
            </button>
            <span className="text-sm text-slate-400">
              Step {currentStepIndex + 1} of {stepOrder.length}
            </span>
          </div>

          {/* Step progress bar */}
          <div className="pb-0">
            <div className="flex gap-0">
              {STEPS.map((step, idx) => {
                const isActive    = step.id === currentStep;
                const isCompleted = completedSteps.has(step.id);
                const isReachable = idx <= currentStepIndex || isCompleted;
                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    disabled={!isReachable}
                    className={`flex-1 pb-3 pt-1 text-center relative transition-colors
                      ${isReachable ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all
                      ${isActive ? 'bg-blue-600' : isCompleted ? 'bg-green-500' : 'bg-slate-100'}`}
                    />
                    <div className={`flex items-center justify-center gap-1.5 text-xs font-medium
                      ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}
                    >
                      <step.icon size={13} />
                      <span className="hidden sm:inline">{step.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Step: BASICS */}
        {currentStep === 'basics' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Tell us about the vehicle</h1>
              <p className="text-slate-500 text-sm mt-1">Start with the essential information</p>
            </div>

            <div className="bg-white rounded-md border border-slate-200 p-8 space-y-7">
              {/* Vehicle type */}
              <FieldWrapper label="Vehicle Type" required error={fieldErrors.type}>
                <div className="flex flex-wrap gap-2 pt-1">
                  {VEHICLE_TYPES.map(t => (
                    <TypeChip
                      key={t}
                      label={t}
                      selected={form.type === t}
                      onClick={() => setField('type', t)}
                    />
                  ))}
                </div>
              </FieldWrapper>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FieldWrapper label="Make" required error={fieldErrors.make}>
                  <input
                    name="make"
                    value={form.make}
                    onChange={handleChange}
                    placeholder="Toyota, Honda, BMW…"
                    autoComplete="off"
                    className={inputClass(fieldErrors.make)}
                  />
                </FieldWrapper>

                <FieldWrapper label="Model" required error={fieldErrors.model}>
                  <input
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                    placeholder="Camry, Civic, X5…"
                    autoComplete="off"
                    className={inputClass(fieldErrors.model)}
                  />
                </FieldWrapper>

                <FieldWrapper label="Year" required error={fieldErrors.year}>
                  <input
                    name="year"
                    type="number"
                    value={form.year}
                    onChange={handleChange}
                    placeholder={String(new Date().getFullYear())}
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    className={inputClass(fieldErrors.year)}
                  />
                </FieldWrapper>

                <FieldWrapper label="Color">
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      name="color"
                      value={form.color}
                      onChange={handleChange}
                      placeholder="Black, White, Red…"
                      className={`pl-9 ${inputClass()}`}
                    />
                  </div>
                </FieldWrapper>
              </div>
            </div>
          </div>
        )}

        {/* Step: SPECS */}
        {currentStep === 'specs' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Vehicle specifications</h1>
              <p className="text-slate-500 text-sm mt-1">Technical details help renters find the right fit</p>
            </div>

            <div className="bg-white rounded-md border border-slate-200 p-8 space-y-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FieldWrapper label="License Plate" required error={fieldErrors.license_plate}>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      name="license_plate"
                      value={form.license_plate}
                      onChange={handleChange}
                      placeholder="29A-12345"
                      className={`pl-9 uppercase ${inputClass(fieldErrors.license_plate)}`}
                    />
                  </div>
                </FieldWrapper>

                <FieldWrapper label="Seating Capacity" error={fieldErrors.seating_capacity}>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      name="seating_capacity"
                      type="number"
                      value={form.seating_capacity}
                      onChange={handleChange}
                      placeholder="5"
                      min="1"
                      className={`pl-9 ${inputClass(fieldErrors.seating_capacity)}`}
                    />
                  </div>
                </FieldWrapper>

                <FieldWrapper label="Fuel Type">
                  <div className="relative">
                    <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <select
                      name="fuel_type"
                      value={form.fuel_type}
                      onChange={handleChange}
                      className={`pl-9 ${inputClass()} bg-white appearance-none`}
                    >
                      <option value="">Select fuel type</option>
                      {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </FieldWrapper>

                <FieldWrapper label="Drivetrain">
                  <select
                    name="drivetrain"
                    value={form.drivetrain}
                    onChange={handleChange}
                    className={`${inputClass()} bg-white`}
                  >
                    <option value="">Select drivetrain</option>
                    {DRIVETRAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </FieldWrapper>

                <FieldWrapper label="Top Speed (mph)" error={fieldErrors.top_speed_mph}>
                  <div className="relative">
                    <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      name="top_speed_mph"
                      type="number"
                      value={form.top_speed_mph}
                      onChange={handleChange}
                      placeholder="120"
                      min="1"
                      className={`pl-9 ${inputClass(fieldErrors.top_speed_mph)}`}
                    />
                  </div>
                </FieldWrapper>

                <FieldWrapper label="Range / Efficiency">
                  <input
                    name="range_efficiency"
                    value={form.range_efficiency}
                    onChange={handleChange}
                    placeholder="400 km · 5.5 L/100km"
                    className={inputClass()}
                  />
                </FieldWrapper>
              </div>

              <FieldWrapper label="Description">
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe condition, features, mileage, or anything renters should know…"
                  className={`${inputClass()} resize-none`}
                />
              </FieldWrapper>
            </div>
          </div>
        )}

        {/* Step: PRICING */}
        {currentStep === 'pricing' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pricing & location</h1>
              <p className="text-slate-500 text-sm mt-1">Set your rate and where the vehicle is based</p>
            </div>

            <div className="bg-white rounded-md border border-slate-200 p-8 space-y-7">
              <FieldWrapper label="Price per Day (USD)" required error={fieldErrors.price_per_day}>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    name="price_per_day"
                    type="number"
                    step="0.01"
                    value={form.price_per_day}
                    onChange={handleChange}
                    placeholder="75.00"
                    min="1"
                    className={`pl-9 ${inputClass(fieldErrors.price_per_day)}`}
                  />
                </div>
                {form.price_per_day && parseFloat(form.price_per_day) >= 1 && (
                  <p className="text-xs text-slate-400 mt-1">
                    ≈ ${(parseFloat(form.price_per_day) * 7).toFixed(0)} / week
                    · ${(parseFloat(form.price_per_day) * 30).toFixed(0)} / month
                  </p>
                )}
              </FieldWrapper>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FieldWrapper label="City">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      name="location_city"
                      value={form.location_city}
                      onChange={handleChange}
                      placeholder="Ho Chi Minh City"
                      className={`pl-9 ${inputClass()}`}
                    />
                  </div>
                </FieldWrapper>

                <FieldWrapper label="State / Province">
                  <input
                    name="location_state"
                    value={form.location_state}
                    onChange={handleChange}
                    placeholder="Ho Chi Minh"
                    className={inputClass()}
                  />
                </FieldWrapper>
              </div>
            </div>

            {/* Summary card */}
            {form.make && form.model && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-5">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-3">Summary so far</p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-blue-900">
                  <span><strong>{form.year} {form.make} {form.model}</strong></span>
                  {form.type    && <span>· {form.type}</span>}
                  {form.color   && <span>· {form.color}</span>}
                  {form.fuel_type && <span>· {form.fuel_type}</span>}
                  {form.seating_capacity && <span>· {form.seating_capacity} seats</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: PHOTOS */}
        {currentStep === 'photos' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Add photos</h1>
              <p className="text-slate-500 text-sm mt-1">
                Great photos lead to more bookings. The first image will be the cover.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-md p-12 text-center transition-all
                ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <Upload className="mx-auto text-slate-300 mb-3" size={36} />
              <p className="text-slate-700 font-medium text-sm">
                Drag & drop images here, or{' '}
                <label
                  htmlFor="vehicle-images"
                  className="text-blue-600 hover:text-blue-800 cursor-pointer underline underline-offset-2"
                >
                  browse
                </label>
              </p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP up to 10MB each</p>
              <input
                id="vehicle-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {imagePreviews.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-3">
                  {imagePreviews.length} image{imagePreviews.length > 1 ? 's' : ''} selected
                  · first image is cover
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border border-slate-200">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          COVER
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center
                                   opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload progress */}
            {submitState === 'uploading' && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                  <span>Uploading images…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {submitState === 'saving' && (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex items-center gap-3 text-sm text-slate-600">
                <Loader2 className="animate-spin text-blue-500" size={16} />
                Saving vehicle details…
              </div>
            )}

            {submitState === 'error' && submitError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Submission failed</p>
                  <p className="text-red-500 text-xs mt-0.5">{submitError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── navigation ── */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md border text-sm font-medium transition-all
              ${currentStepIndex === 0
                ? 'opacity-0 pointer-events-none'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <ChevronLeft size={16} /> Back
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitState === 'saving' || submitState === 'uploading'}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-white text-sm font-semibold transition-all
                ${submitState === 'saving' || submitState === 'uploading'
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                }`}
            >
              {submitState === 'saving' || submitState === 'uploading' ? (
                <><Loader2 className="animate-spin" size={15} /> Submitting…</>
              ) : submitState === 'error' ? (
                <><ArrowRight size={15} /> Retry Submission</>
              ) : (
                <><ArrowRight size={15} /> Submit for Approval</>
              )}
            </button>
          )}
        </div>

        {isLastStep && (
          <p className="text-center text-xs text-slate-400 mt-4">
            Your vehicle will be reviewed by our team before going live
          </p>
        )}
      </div>
    </div>
  );
}