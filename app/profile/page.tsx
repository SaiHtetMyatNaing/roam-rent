// app/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  User, 
  Settings, 
  Calendar, 
  Car, 
  DollarSign, 
  Shield, 
  Users, 
  CheckCircle, 
  LogOut, 
  Menu, 
  X,
  Edit,
  Save,
  MapPin,
  Phone,
  Info,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const supabase = createClient();

type UserRole = 'customer' | 'vehicle-owner' | 'admin' | null;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // ✅ FIX 1: Split into two states — saves no longer trigger the full-page spinner.
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const storedEmail = localStorage.getItem('user_email');
      if (!storedEmail) {
        router.replace('/sign-in');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, phone, role, avatar_url, bio, address_street, address_city, address_state, address_zip, address_country')
          .eq('email', storedEmail.trim().toLowerCase())
          .single();

        if (error || !data) {
          localStorage.removeItem('user_email');
          localStorage.removeItem('user_data');
          router.replace('/sign-in');
          return;
        }

        setUser(data);
        setEditForm(data);
      } catch (err) {
        console.error('Profile fetch error:', err);
        router.replace('/sign-in');
      } finally {
        setPageLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_data');
    showToast('Logged out successfully', 'success');
    router.replace('/');
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
          bio: editForm.bio,
          address_street: editForm.address_street,
          address_city: editForm.address_city,
          address_state: editForm.address_state,
          address_zip: editForm.address_zip,
          address_country: editForm.address_country,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser(editForm);
      setIsEditing(false);
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      console.error('Update error:', err);
      showToast(err.message || 'Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-blue-700 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const role = user.role as UserRole;

  const sidebarItems: Record<string, any[]> = {
    customer: [
      { icon: User,          label: 'My Profile',        href: '/profile',                   active: true },
      { icon: Calendar,      label: 'My Bookings',       href: '/bookings' },
      { icon: MessageCircle, label: 'Support',            href: '/support' },
      { icon: LogOut,        label: 'Logout',             href: '#', onClick: handleLogout },
    ],
    // ✅ Key stays 'vehicle-owner' — matches your DB value
    'vehicle-owner': [
      { icon: User,          label: 'My Profile',        href: '/profile',                   active: true },
      { icon: Car,           label: 'My Vehicles',       href: '/owner-dashboard/vehicles' },
      { icon: DollarSign,    label: 'Earnings',          href: '/owner-dashboard/earning' },
      { icon: Calendar,      label: 'Bookings',          href: '/owner-dashboard/bookings' },
      { icon: MessageCircle, label: 'Support',           href: '/support' },
      { icon: Settings,      label: 'Settings',          href: '/profile/settings' },
      { icon: LogOut,        label: 'Logout',            href: '#', onClick: handleLogout },
    ],
    admin: [
      { icon: User,          label: 'My Profile',        href: '/profile',                active: true },
      { icon: Users,         label: 'Manage Users',      href: '/admin/users' },
      { icon: Car,           label: 'Approve Vehicles',  href: '/admin/vehicles' },
      { icon: MessageCircle, label: 'Disputes',          href: '/admin/disputes' },
      { icon: Shield,        label: 'System Settings',   href: '/admin/identity-verification' },
      { icon: CheckCircle,   label: 'Bookings',          href: '/admin-dashboard/bookings' },
      { icon: LogOut,        label: 'Logout',            href: '#', onClick: handleLogout },
    ],
  };

  const normalizedRole: string = role && role in sidebarItems ? role : 'customer';
  const items = sidebarItems[normalizedRole];

  // ✅ FIX 2: 'vehicle-owner' with CSS capitalize renders as "Vehicle-owner".
  //           Use an explicit map for clean display labels.
  const roleDisplayLabel: Record<string, string> = {
    customer:        'Customer',
    'vehicle-owner': 'Vehicle Owner',
    admin:           'Admin',
  };
  const displayRole = roleDisplayLabel[normalizedRole] ?? normalizedRole;

  // ─── Deduplicated sidebar components (used by both desktop + mobile) ─────────
  const SidebarUserInfo = () => (
    <div className="flex items-center gap-4 mb-12">
      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-100 bg-gray-100 flex items-center justify-center flex-shrink-0">
        {user.avatar_url ? (
          <Image src={user.avatar_url} alt="Avatar" width={64} height={64} className="object-cover" unoptimized />
        ) : (
          <User size={32} className="text-gray-500" />
        )}
      </div>
      <div>
        <h2 className="font-semibold text-gray-900 text-lg">
          {user.first_name || 'User'} {user.last_name || ''}
        </h2>
        <p className="text-sm text-gray-500">{displayRole}</p>
      </div>
    </div>
  );

  const SidebarNav = () => (
    <nav className="space-y-1">
      {items.map((item, idx) =>
        item.onClick ? (
          <button
            key={idx}
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-left ${
              item.label === 'Logout' ? 'mt-12 !text-red-600 hover:!bg-red-50' : ''
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ) : (
          <Link
            key={idx}
            href={item.href}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors ${
              item.active ? 'bg-blue-50 text-blue-700 font-medium' : ''
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        )
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-xs w-full">
          <div className={`flex items-center gap-3 p-4 rounded-xl shadow-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="flex-1 text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-white/90 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden mt-14 md:block w-72 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 overflow-y-auto z-30">
          <div className="p-6">
            <SidebarUserInfo />
            <SidebarNav />
          </div>
        </aside>

        {/* Mobile Toggle */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Sidebar */}
        {isSidebarOpen && (
          <div className="md:hidden fixed inset-0 bg-black/60 z-50" onClick={() => setIsSidebarOpen(false)}>
            <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                  <button onClick={() => setIsSidebarOpen(false)}>
                    <X size={28} className="text-gray-700" />
                  </button>
                </div>
                <SidebarUserInfo />
                <SidebarNav />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 md:ml-72 p-6 md:p-10 min-h-screen">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">My Profile</h1>
          <p className="text-gray-600 mb-10">Manage your personal information and account preferences</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Overview Card */}
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-center mb-8">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-blue-100 bg-gray-100 flex items-center justify-center mb-5 relative">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt="Profile picture" width={128} height={128} className="object-cover" unoptimized />
                  ) : (
                    <User size={64} className="text-gray-500" />
                  )}
                  <button className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2.5 shadow-md hover:bg-blue-700 transition-colors">
                    <Edit size={16} />
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.first_name || 'User'} {user.last_name || ''}
                </h2>
                <p className="text-gray-600">{user.email}</p>
                {/* ✅ FIX 2 applied here too */}
                <p className="text-sm font-medium text-blue-600 mt-2">{displayRole}</p>
              </div>

              <div className="space-y-5 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-gray-500" />
                  <span>{user.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-gray-500" />
                  <span>
                    {user.address_city || 'Not provided'}
                    {user.address_city && user.address_country ? ', ' : ''}
                    {user.address_country || ''}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Info size={18} className="text-gray-500 mt-0.5" />
                  <span className="leading-relaxed">{user.bio || 'No bio yet'}</span>
                </div>
              </div>
            </div>

            {/* Personal Info Card */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Personal Information</h2>
                <button
                  onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
                  disabled={saving}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isEditing ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                  } ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isEditing ? (
                    saving
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                      : <><Save size={16} /> Save Changes</>
                  ) : (
                    <><Edit size={16} /> Edit Profile</>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                  {isEditing ? (
                    <input name="first_name" value={editForm.first_name || ''} onChange={handleEditChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all" />
                  ) : (
                    <div className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">{user.first_name || 'Not set'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                  {isEditing ? (
                    <input name="last_name" value={editForm.last_name || ''} onChange={handleEditChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all" />
                  ) : (
                    <div className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">{user.last_name || 'Not set'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-600">{user.email}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  {isEditing ? (
                    <input name="phone" value={editForm.phone || ''} onChange={handleEditChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all" />
                  ) : (
                    <div className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">{user.phone || 'Not set'}</div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                  {isEditing ? (
                    <textarea name="bio" value={editForm.bio || ''} onChange={handleEditChange} rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none resize-y transition-all" />
                  ) : (
                    <div className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 leading-relaxed">{user.bio || 'No bio yet'}</div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                  {isEditing ? (
                    <div className="space-y-4">
                      <input name="address_street" value={editForm.address_street || ''} onChange={handleEditChange} placeholder="Street address"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all" />
                      <div className="grid grid-cols-2 gap-4">
                        <input name="address_city" value={editForm.address_city || ''} onChange={handleEditChange} placeholder="City"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all" />
                        <input name="address_state" value={editForm.address_state || ''} onChange={handleEditChange} placeholder="State / Province"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all" />
                      </div>
                      <input name="address_zip" value={editForm.address_zip || ''} onChange={handleEditChange} placeholder="Zip / Postal code"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all" />
                      <input name="address_country" value={editForm.address_country || 'Vietnam'} onChange={handleEditChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200/40 outline-none transition-all" />
                    </div>
                  ) : (
                    <div className="py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">
                      {user.address_street && <p>{user.address_street}</p>}
                      <p>
                        {user.address_city && `${user.address_city}, `}
                        {user.address_state && `${user.address_state} `}
                        {user.address_zip && user.address_zip}
                      </p>
                      <p>{user.address_country || 'Vietnam'}</p>
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-10 flex flex-wrap gap-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                      saving ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {saving ? (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                    ) : (
                      <><Save size={16} /> Save Changes</>
                    )}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditForm(user); }}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}