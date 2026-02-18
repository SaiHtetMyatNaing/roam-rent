'use client';

import React, { useState, ChangeEvent } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Camera,
  ShieldCheck,
  Globe,
  HeartHandshake,
  Clock,
  CarFront,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const supabase = createClient();

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: 'customer' | 'vehicle-owner';
  bio: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  addressCountry: string;
  avatar_url?: string | null;
}

interface Errors {
  [key: string]: string | undefined;
}

const InputField = ({
  label,
  name,
  type = 'text',
  placeholder,
  icon: Icon,
  error,
  value,
  onChange,
  showPassword,
  setShowPassword,
}: {
  label: string;
  name: keyof FormData;
  type?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  error?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword?: boolean;
  setShowPassword?: (show: boolean) => void;
}) => {
  const isPasswordField = name === 'password' || name === 'confirmPassword';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Icon size={18} />
          </div>
        )}
        <input
          name={name}
          type={isPasswordField ? (showPassword ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          autoComplete="off"
          className={`
            w-full py-3 bg-white border transition-all outline-none text-sm rounded-lg
            ${Icon ? 'pl-11' : 'pl-4'}
            ${isPasswordField ? 'pr-11' : 'pr-4'}
            ${error
              ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
              : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40'}
            text-gray-900 placeholder:text-gray-400
          `}
          placeholder={placeholder}
        />
        {isPasswordField && setShowPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-gray-200">
    <Icon className="text-blue-600" size={20} />
    <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h2>
  </div>
);

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    bio: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCountry: 'Vietnam',
    avatar_url: null,
  });

  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.size > 2 * 1024 * 1024) {
      setServerError('Image must be under 2MB');
      return;
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setUploading(true);
    setServerError(null);

    try {
      const { error: uploadError } = await supabase.storage
        .from('profile')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profile').getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (err: any) {
      setServerError('Avatar upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const newErrors: Errors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Invalid phone format';
    }

    if (!formData.password.trim()) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) newErrors.role = 'Please select a role';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);

    try {
      // 1. Create user in public.users table
      const { error: insertError } = await supabase.from('users').insert({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password_hash: formData.password, // ← TODO: replace with Supabase Auth!
        role: formData.role,
        status: 'active',
        bio: formData.bio.trim() || null,
        avatar_url: formData.avatar_url || null,
        address_street: formData.addressStreet.trim() || null,
        address_city: formData.addressCity.trim() || null,
        address_state: formData.addressState.trim() || null,
        address_zip: formData.addressZip.trim() || null,
        address_country: formData.addressCountry.trim() || 'Vietnam',
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setServerError('This email is already registered.');
        } else {
          setServerError(insertError.message || 'Failed to create account');
        }
        return;
      }

      // 2. Log the user in automatically (same keys as sign-in page)
      localStorage.setItem('user_email', formData.email.trim().toLowerCase());
      localStorage.setItem('user_data', JSON.stringify({
        first_name: formData.firstName.trim(),
        avatar_url: formData.avatar_url || null,
        role: formData.role,
      }));

      // Notify other tabs / components
      window.dispatchEvent(new Event('storage'));

      setSuccessMessage('Account created successfully! Redirecting...');

      // Redirect after short delay to show success message
      setTimeout(() => {
        router.push('/vehicles');
      }, 1800);

    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-5 sm:px-6 lg:px-8">
      <div className="max-w-7xl w-full grid lg:grid-cols-5 gap-10 xl:gap-16 items-start">
        {/* LEFT - Promotion / Benefits */}
        <div className="hidden lg:flex lg:col-span-2 flex-col justify-center space-y-10 lg:sticky lg:top-10">
          <h1 className="text-4xl lg:text-5xl font-black text-gray-900 leading-tight tracking-tight">
            Join <span className="text-blue-600">RoamRent</span><br />
            today.
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
            Become part of a community that values comfort, reliability, and freedom on the road.
          </p>

          <div className="space-y-9">
            {[
              {
                icon: ShieldCheck,
                title: 'Secure & Insured',
                desc: 'Every rental comes with full insurance coverage for complete peace of mind.',
              },
              {
                icon: Clock,
                title: '24/7 Support',
                desc: 'Our team is always ready to help — anytime, anywhere.',
              },
              {
                icon: CarFront,
                title: 'Premium Vehicles',
                desc: 'Wide range of cars — from economy to luxury — ready when you are.',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-5">
                <div className="p-3.5 bg-blue-50 rounded-lg shrink-0">
                  <item.icon className="text-blue-600" size={28} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{item.title}</h3>
                  <p className="text-gray-600 mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT - Registration Form */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden w-full">
          <div className="p-8 lg:p-10 xl:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Create Your Account
            </h2>
            <p className="text-gray-600 text-center mb-10">
              Join thousands of happy drivers and vehicle owners.
            </p>

            {serverError && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-8 p-4 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm flex items-center justify-center gap-3">
                <CheckCircle2 size={20} />
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Personal & Account */}
              <div className="space-y-7">
                <SectionHeader icon={User} title="Personal Information" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label="First Name"
                    name="firstName"
                    placeholder="Jane"
                    icon={User}
                    error={errors.firstName}
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Last Name"
                    name="lastName"
                    placeholder="Smith"
                    icon={User}
                    error={errors.lastName}
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="jane@example.com"
                    icon={Mail}
                    error={errors.email}
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    placeholder="+84 123 456 789"
                    icon={Phone}
                    error={errors.phone}
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label="Password"
                    name="password"
                    placeholder="At least 8 characters"
                    icon={Lock}
                    error={errors.password}
                    value={formData.password}
                    onChange={handleChange}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                  />
                  <InputField
                    label="Confirm Password"
                    name="confirmPassword"
                    placeholder="Repeat password"
                    icon={Lock}
                    error={errors.confirmPassword}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    showPassword={showConfirm}
                    setShowPassword={setShowConfirm}
                  />
                </div>
              </div>

              {/* Role & Profile */}
              <div className="space-y-7">
                <SectionHeader icon={ShieldCheck} title="Account Type & Profile" />

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-3">
                    I want to be a...
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'customer', label: 'Customer', sub: 'Rent vehicles' },
                      { id: 'vehicle-owner', label: 'Vehicle Owner', sub: 'List & earn' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, role: r.id as FormData['role'] }))}
                        className={`
                          p-5 rounded-lg border text-center transition-all
                          ${formData.role === r.id
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 font-medium'
                            : 'border-gray-300 hover:border-gray-400'}
                        `}
                      >
                        <div className="font-semibold text-gray-900">{r.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{r.sub}</div>
                      </button>
                    ))}
                  </div>
                  {errors.role && <p className="text-xs text-red-500 mt-2">{errors.role}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Short Bio (optional)</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-3.5 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none resize-none text-sm text-gray-900 placeholder:text-gray-400"
                    placeholder="Tell others a bit about yourself..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 block">Profile Photo (optional)</label>
                  <div className="flex items-center gap-6">
                    <div className="shrink-0">
                      {formData.avatar_url ? (
                        <img
                          src={formData.avatar_url}
                          alt="Avatar preview"
                          className="w-20 h-20 object-cover rounded-full border-2 border-gray-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                          <Camera size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block">
                        <span
                          className={`inline-block px-6 py-3 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                            uploading
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {uploading ? 'Uploading...' : 'Upload Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          onChange={handleAvatarUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">JPG, PNG • Max 2MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-7">
                <SectionHeader icon={MapPin} title="Address Details" />

                <InputField
                  label="Street Address"
                  name="addressStreet"
                  placeholder="123 Main Street"
                  icon={MapPin}
                  error={errors.addressStreet}
                  value={formData.addressStreet}
                  onChange={handleChange}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label="City"
                    name="addressCity"
                    placeholder="Hanoi"
                    value={formData.addressCity}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Province / State"
                    name="addressState"
                    placeholder="Hanoi"
                    value={formData.addressState}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <InputField
                    label="Postal Code"
                    name="addressZip"
                    placeholder="100000"
                    value={formData.addressZip}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Country"
                    name="addressCountry"
                    placeholder="Vietnam"
                    value={formData.addressCountry}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-8 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading || uploading}
                  className={`
                    w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-lg font-semibold text-base transition-all shadow-sm
                    ${isLoading || uploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-[0.98]'}
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating account...
                    </>
                  ) : uploading ? (
                    'Uploading avatar...'
                  ) : (
                    'Create Account'
                  )}
                </button>

                <p className="text-center text-sm text-gray-600 mt-6">
                  Already have an account?{' '}
                  <a href="/sign-in" className="text-blue-600 font-semibold hover:underline transition-colors">
                    Sign in
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}