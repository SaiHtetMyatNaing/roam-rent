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
  role: 'customer' | 'car-owner';
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
  icon?: React.ComponentType<{ size?: number }>;
  error?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showPassword?: boolean;
  setShowPassword?: (show: boolean) => void;
}) => {
  const isPasswordField = name === 'password' || name === 'confirmPassword';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
            w-full py-2.5 bg-white border transition-colors outline-none text-sm
            ${Icon ? 'pl-10' : 'pl-4'}
            ${isPasswordField ? 'pr-10' : 'pr-4'}
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}
            rounded-md text-slate-900 placeholder:text-slate-400
          `}
          placeholder={placeholder}
        />
        {isPasswordField && setShowPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
    <Icon className="text-blue-600" size={18} />
    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h2>
  </div>
);

export default function RegisterPage() {

   const checkUser = async () => {
    const storedEmail = localStorage.getItem('user_email');
    console.log('Navbar checking localStorage:', storedEmail); // ← debug

    if (!storedEmail) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, avatar_url, first_name')
        .eq('email', storedEmail.trim().toLowerCase())
        .single();

      console.log('Supabase user fetch result:', { data, error }); // ← debug

      if (error || !data) {
        localStorage.removeItem('user_email');
        setCurrentUser(null);
      } else {
        setCurrentUser({
          id: data.id,
          role: data.role as UserRole,
          avatar_url: data.avatar_url,
          first_name: data.first_name,
        });
      }
    } catch (err) {
      console.error('Navbar user check error:', err);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };


  checkUser();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    addressCountry: 'USA',
    avatar_url: null,
  });

  const [errors, setErrors] = useState<Errors>({});

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    const filePath = fileName;

    setUploading(true);
    setServerError(null);

    try {
      const { error: uploadError } = await supabase.storage.from('profile').upload(filePath, file);
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

    if (!formData.firstName.trim()) newErrors.firstName = 'First name required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name required';
    if (!formData.email.trim()) newErrors.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';

    if (!formData.phone.trim()) newErrors.phone = 'Phone number required';
    else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Invalid phone format';
    }

    if (!formData.password.trim()) newErrors.password = 'Password required';
    else if (formData.password.length < 8) newErrors.password = 'Min 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords mismatch';

    if (!formData.role) newErrors.role = 'Select a role';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        document.getElementsByName(firstError)[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      const { error } = await supabase.from('users').insert({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password_hash: formData.password,
        role: formData.role,
        status: 'active',
        bio: formData.bio.trim() || null,
        avatar_url: formData.avatar_url || null,
        address_street: formData.addressStreet.trim() || null,
        address_city: formData.addressCity.trim() || null,
        address_state: formData.addressState.trim() || null,
        address_zip: formData.addressZip.trim() || null,
        address_country: formData.addressCountry.trim() || 'USA',
      });

      if (error) {
        if (error.code === '23505') {
          setServerError('This email is already registered.');
        } else {
          setServerError(error.message || 'Failed to create account');
        }
        return;
      }

      router.push('/vehicles');
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center py-16 px-6 lg:px-8">
      <div className="max-w-7xl w-full grid lg:grid-cols-5 gap-12 xl:gap-16 items-start">
        {/* LEFT SECTION - Promotion */}
        <div className="lg:col-span-2 flex flex-col justify-start space-y-10">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
            Start your journey with<br />
            <span className="text-blue-600">premium comfort</span>.
          </h1>

          <p className="text-lg text-slate-600 leading-relaxed">
            Join thousands of satisfied customers who trust RoamRent for their daily commutes and weekend getaways.
          </p>

          <div className="space-y-10">
            <div className="flex items-start gap-5">
              <div className="p-3.5 bg-blue-100 rounded-full shrink-0">
                <ShieldCheck className="text-blue-600" size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">Fully Insured Rides</h3>
                <p className="text-slate-600 mt-1.5">
                  Every rental includes comprehensive insurance coverage for peace of mind.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="p-3.5 bg-blue-100 rounded-full shrink-0">
                <Clock className="text-blue-600" size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">24/7 Customer Support</h3>
                <p className="text-slate-600 mt-1.5">
                  Our dedicated team is available around the clock to assist you.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="p-3.5 bg-blue-100 rounded-full shrink-0">
                <CarFront className="text-blue-600" size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">Premium Fleet</h3>
                <p className="text-slate-600 mt-1.5">
                  Choose from our wide selection of luxury and economy vehicles.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION - Register Form (wider) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-8 lg:p-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">
              Create Your Account
            </h2>
            <p className="text-slate-500 text-center mb-10">
              Join RoamRent today and start your journey.
            </p>

            {serverError && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Personal & Account */}
              <div className="space-y-6">
                <SectionHeader icon={ShieldCheck} title="Personal & Account" />
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
                    placeholder="+84123456789 (required)"
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
                    placeholder="Min 8 chars"
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

              {/* Profile Details */}
              <div className="space-y-6">
                <SectionHeader icon={User} title="Profile Details" />
                <div className="space-y-4">
                  <span className="text-sm font-medium text-slate-700 block">I am a...</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { id: 'customer', label: 'Customer', sub: 'Rent vehicles' },
                      { id: 'car-owner', label: 'Owner', sub: 'List fleet' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, role: r.id as FormData['role'] }))}
                        className={`
                          p-5 rounded-lg border text-center transition-all text-base
                          ${formData.role === r.id
                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600 font-semibold'
                            : 'border-slate-300 hover:border-slate-400'}
                        `}
                      >
                        {r.label}
                        <p className="text-xs text-slate-500 mt-1">{r.sub}</p>
                      </button>
                    ))}
                  </div>
                  {errors.role && <p className="text-[11px] text-red-500">{errors.role}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Short Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    className="w-full p-3 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 placeholder:text-slate-400 resize-none text-sm"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">Profile Avatar (optional)</label>
                  <div className="flex items-center gap-6">
                    <div className="shrink-0">
                      {formData.avatar_url ? (
                        <img
                          src={formData.avatar_url}
                          alt="Avatar"
                          className="w-20 h-20 object-cover rounded-full border-2 border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                          <Camera size={24} className="text-slate-400" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block">
                        <span
                          className={`inline-block px-6 py-3 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                            uploading ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {uploading ? 'Uploading...' : 'Choose Image'}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          onChange={handleAvatarUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-2 text-xs text-slate-500">JPG, PNG or GIF • Max 2MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-6">
                <SectionHeader icon={Globe} title="Address Information" />
                <InputField
                  label="Street Address"
                  name="addressStreet"
                  placeholder="123 Avenue Blvd"
                  icon={MapPin}
                  error={errors.addressStreet}
                  value={formData.addressStreet}
                  onChange={handleChange}
                />
                <div className="grid grid-cols-2 gap-5">
                  <InputField
                    label="City"
                    name="addressCity"
                    placeholder="City"
                    value={formData.addressCity}
                    onChange={handleChange}
                  />
                  <InputField
                    label="State / Province"
                    name="addressState"
                    placeholder="State"
                    value={formData.addressState}
                    onChange={handleChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <InputField
                    label="Postal Code"
                    name="addressZip"
                    placeholder="00000"
                    value={formData.addressZip}
                    onChange={handleChange}
                  />
                  <InputField
                    label="Country"
                    name="addressCountry"
                    placeholder="Country"
                    value={formData.addressCountry}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-10 space-y-6 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isLoading || uploading}
                  className={`
                    w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-lg font-bold text-base transition-all shadow-md
                    ${isLoading || uploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-[0.98]'}
                  `}
                >
                  {isLoading ? 'Creating Account...' : uploading ? 'Uploading...' : 'Create Account'}
                </button>

                <p className="text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <a href="/login" className="text-blue-600 font-bold hover:underline">
                    Log In
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