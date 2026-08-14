import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import authApi from '../api/authApi';
import uploadApi from '../api/uploadApi';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import {
  User,
  Camera,
  Upload,
  ShieldCheck,
  Phone,
  Lock,
  Plus,
  Trash2,
  UserCheck,
  CheckCircle,
  Save,
} from 'lucide-react';

export const ProfileSettings = () => {
  const { user, setUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'commuter',
    emergencyPhrase: user?.emergencyPhrase || 'Lavender Moonlight',
    duressPin: user?.duressPin || '9999',
    avatarUrl: user?.avatarUrl || '',
    guardians: user?.guardians || [],
  });

  const [newGuardian, setNewGuardian] = useState({
    name: '',
    phone: '',
    relationship: 'Family',
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'commuter',
        emergencyPhrase: user.emergencyPhrase || 'Lavender Moonlight',
        duressPin: user.duressPin || '9999',
        avatarUrl: user.avatarUrl || '',
        guardians: user.guardians || [],
      });
    }
  }, [user]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const url = await uploadApi.uploadImage(file);
      setFormData((prev) => ({ ...prev, avatarUrl: url }));
      setStatusMessage('Avatar uploaded to Cloudinary! Click Save Profile to apply.');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Cloudinary Avatar upload failed: ' + err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddGuardian = (e) => {
    e.preventDefault();
    if (!newGuardian.name || !newGuardian.phone) return;
    setFormData((prev) => ({
      ...prev,
      guardians: [...prev.guardians, newGuardian],
    }));
    setNewGuardian({ name: '', phone: '', relationship: 'Family' });
  };

  const handleRemoveGuardian = (index) => {
    setFormData((prev) => ({
      ...prev,
      guardians: prev.guardians.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setStatusMessage('');
      const updatedUser = await authApi.updateProfile(formData);
      setUser((prev) => ({ ...prev, ...updatedUser }));
      setStatusMessage('Profile & Avatar settings updated successfully!');
    } catch (err) {
      console.error('Failed to save profile:', err);
      alert('Failed to save profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-[#6B4355] tracking-tight flex items-center gap-2">
          <User className="w-8 h-8 text-[#6B4355]" />
          Profile & Safety Account Settings
        </h1>
        <p className="text-xs text-[#8C7A87] font-medium mt-1">
          Manage your personal commuter avatar, emergency contacts, role permissions, and safety settings.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar Card & Account Role Info (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="text-center space-y-4">
            <div className="relative w-28 h-28 mx-auto">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={formData.name}
                  className="w-full h-full rounded-full object-cover border-4 border-[#6B4355] shadow-lg"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#6B4355]/10 text-[#6B4355] border-4 border-[#6B4355]/20 flex items-center justify-center font-black text-3xl shadow-inner">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <label className="absolute bottom-0 right-0 p-2 bg-[#6B4355] hover:bg-[#543343] text-white rounded-full cursor-pointer shadow-md transition-all active:scale-95">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h3 className="font-black text-lg text-[#2D2329]">{formData.name || 'User'}</h3>
              <p className="text-xs text-[#8C7A87] font-medium">{formData.email}</p>
              <div className="mt-2 inline-block">
                <Badge variant="verified" className="capitalize font-extrabold px-3 py-1">
                  {formData.role} Account
                </Badge>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F0EBF0]">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-[#F9F8FA] hover:bg-[#6B4355] hover:text-white border border-[#E0D5DC] text-[#6B4355] rounded-2xl text-xs font-bold transition-all shadow-sm w-full justify-center">
                <Upload className="w-4 h-4" />
                <span>{uploadingAvatar ? 'Uploading to Cloudinary...' : 'Upload Cloudinary Avatar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>
          </Card>

          <Card className="space-y-3 bg-gradient-to-br from-[#FDF7F9] to-white border-[#E0D5DC]">
            <div className="flex items-center gap-2 text-[#6B4355] font-extrabold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Platform Role Access</span>
            </div>
            <p className="text-xs text-[#4A3D46] font-medium leading-relaxed">
              Your account has full privileges for Commuter tracking, live hazard reporting, and guardian notification broadcasting.
            </p>
          </Card>
        </div>

        {/* Right Column: Profile Form Details & Guardian List (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="space-y-4">
            <h3 className="text-base font-extrabold text-[#2D2329] border-b border-[#F0EBF0] pb-3 flex items-center gap-2">
              <User className="w-5 h-5 text-[#6B4355]" />
              Personal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+880 1711-xxxxxx"
              />
            </div>

            <Input
              label="Email Address"
              value={formData.email}
              disabled
              className="opacity-70 bg-gray-100 cursor-not-allowed"
            />
          </Card>

          <Card className="space-y-4">
            <h3 className="text-base font-extrabold text-[#2D2329] border-b border-[#F0EBF0] pb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#6B4355]" />
              Voice Emergency & Duress PIN
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Emergency Phrase"
                value={formData.emergencyPhrase}
                onChange={(e) => setFormData({ ...formData, emergencyPhrase: e.target.value })}
              />
              <Input
                label="Duress PIN"
                type="password"
                maxLength="4"
                value={formData.duressPin}
                onChange={(e) => setFormData({ ...formData, duressPin: e.target.value })}
              />
            </div>
          </Card>

          {/* Emergency Guardian Contacts Card */}
          <Card className="space-y-4">
            <h3 className="text-base font-extrabold text-[#2D2329] border-b border-[#F0EBF0] pb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#6B4355]" />
              Emergency Guardians & Trusted Contacts
            </h3>

            {formData.guardians.length === 0 ? (
              <p className="text-xs text-[#8C7A87] font-medium">No custom guardians added yet.</p>
            ) : (
              <div className="space-y-2">
                {formData.guardians.map((g, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#F9F8FA] border border-[#E0D5DC] rounded-2xl flex items-center justify-between text-xs font-semibold"
                  >
                    <div>
                      <span className="font-extrabold text-[#2D2329] block">{g.name || g}</span>
                      <span className="text-[11px] text-[#8C7A87]">
                        {g.phone || 'Standard Contact'} {g.relationship ? `(${g.relationship})` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGuardian(idx)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Guardian Section */}
            <div className="pt-3 border-t border-[#F0EBF0] space-y-3">
              <span className="text-xs font-extrabold text-[#6B4355] block">Add Emergency Contact</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Guardian Name"
                  value={newGuardian.name}
                  onChange={(e) => setNewGuardian({ ...newGuardian, name: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#F9F8FA] border border-[#E0D5DC] text-xs font-medium"
                />
                <input
                  type="text"
                  placeholder="Phone (+880...)"
                  value={newGuardian.phone}
                  onChange={(e) => setNewGuardian({ ...newGuardian, phone: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-[#F9F8FA] border border-[#E0D5DC] text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddGuardian}
                  className="px-4 py-2 bg-[#6B4355] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:bg-[#543343] transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Guardian
                </button>
              </div>
            </div>
          </Card>

          <Button type="submit" loading={saving} size="lg" className="w-full py-4 font-extrabold text-sm shadow-md">
            <Save className="w-5 h-5 mr-2" />
            Save Profile & Avatar Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
