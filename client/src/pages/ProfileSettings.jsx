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
  Search,
  UserPlus,
  ShieldAlert,
  AlertTriangle,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

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

  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      setSearchError('');
      const results = await authApi.searchUsers(query);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Failed to search user accounts:', err);
      setSearchError('Failed to search registered platform users.');
    } finally {
      setSearching(false);
    }
  };

  const handleLinkGuardian = (targetUser) => {
    if (formData.guardians.length >= 3) {
      alert('Maximum 3 emergency guardians can be linked.');
      return;
    }

    const alreadyLinked = formData.guardians.some(
      (g) =>
        (g.user && String(g.user) === String(targetUser._id)) ||
        (g.email && g.email.toLowerCase() === targetUser.email.toLowerCase()) ||
        (g.phone && targetUser.phone && g.phone === targetUser.phone)
    );

    if (alreadyLinked) {
      alert(`${targetUser.name} is already linked as an emergency guardian.`);
      return;
    }

    const newGuardianEntry = {
      user: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone || '',
      avatarUrl: targetUser.avatarUrl || '',
      relationship: 'Family',
    };

    setFormData((prev) => ({
      ...prev,
      guardians: [...prev.guardians, newGuardianEntry],
    }));

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUpdateGuardianRelationship = (index, relationship) => {
    setFormData((prev) => {
      const updated = [...prev.guardians];
      updated[index] = { ...updated[index], relationship };
      return { ...prev, guardians: updated };
    });
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
          <Card className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#F0EBF0] pb-3 gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#6B4355]" />
                <h3 className="text-base font-extrabold text-[#2D2329]">
                  Emergency Guardians & Connected Accounts
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                formData.guardians.length >= 3
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {formData.guardians.length} / 3 Guardians Linked
              </span>
            </div>

            <p className="text-xs text-[#8C7A87] font-medium leading-relaxed">
              Connect registered PATHPROHORI user accounts as your official emergency guardians. In the event of a signal-loss heartbeat timeout, automated safety alerts will be broadcast to these connected accounts.
            </p>

            {/* Currently Linked Guardians List */}
            {formData.guardians.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#F9F8FA] border border-dashed border-[#E0D5DC] text-center space-y-1">
                <UserCheck className="w-8 h-8 text-[#8C7A87] mx-auto opacity-40" />
                <p className="text-xs font-extrabold text-[#6B4355]">No connected guardians linked yet</p>
                <p className="text-[11px] text-[#8C7A87]">Search the registered user database below to link up to 3 guardian accounts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-[#6B4355] block uppercase tracking-wider">
                  Linked Guardian Accounts ({formData.guardians.length}/3)
                </span>
                {formData.guardians.map((g, idx) => (
                  <div
                    key={g.user || g._id || idx}
                    className="p-3.5 bg-[#F9F8FA] border border-[#E0D5DC] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {g.avatarUrl ? (
                        <img
                          src={g.avatarUrl}
                          alt={g.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#6B4355] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#6B4355]/10 text-[#6B4355] font-black flex items-center justify-center text-sm border border-[#6B4355]/20 shrink-0">
                          {g.name ? g.name.charAt(0).toUpperCase() : 'G'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-[#2D2329] block truncate">
                          {g.name || 'Guardian User'}
                        </span>
                        <span className="text-[11px] text-[#8C7A87] font-medium block truncate">
                          {g.email || g.phone || 'Connected Platform Account'}
                        </span>
                        {g.phone && (
                          <span className="text-[10px] text-[#6B4355] font-semibold flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#6B4355]" /> {g.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <select
                        value={g.relationship || 'Family'}
                        onChange={(e) => handleUpdateGuardianRelationship(idx, e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E0D5DC] text-[11px] font-bold text-[#6B4355] focus:outline-none"
                      >
                        <option value="Family">Family</option>
                        <option value="Friend">Friend</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Emergency Contact">Emergency Contact</option>
                        <option value="Spouse">Spouse</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveGuardian(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-rose-200"
                        title="Remove Guardian Link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search Registered Users Database Section */}
            <div className="pt-4 border-t border-[#F0EBF0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#6B4355] block uppercase tracking-wider">
                  Search Registered User Database
                </span>
                {formData.guardians.length >= 3 && (
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Max 3 Guardians Limit Reached
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-[#8C7A87] absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Type name, email, or phone number to search commuter/guardian accounts..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  disabled={formData.guardians.length >= 3}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F9F8FA] border border-[#E0D5DC] text-xs font-semibold text-[#2D2329] focus:outline-none focus:border-[#6B4355] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {searching && (
                <p className="text-xs text-[#8C7A87] font-semibold animate-pulse">
                  Searching database for matching platform accounts...
                </p>
              )}

              {searchError && (
                <p className="text-xs text-rose-600 font-semibold">{searchError}</p>
              )}

              {/* Search Results Dropdown List */}
              {searchResults.length > 0 && (
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto custom-scrollbar p-1 border border-[#E0D5DC] rounded-2xl bg-white shadow-md">
                  <span className="text-[10px] font-extrabold text-[#8C7A87] uppercase tracking-wider px-2 py-1 block">
                    Select Account to Link as Guardian ({searchResults.length} found)
                  </span>
                  {searchResults.map((usr) => {
                    const isAlreadyLinked = formData.guardians.some(
                      (g) => (g.user && String(g.user) === String(usr._id)) || g.email === usr.email
                    );
                    return (
                      <div
                        key={usr._id}
                        className="p-2.5 bg-[#F9F8FA] hover:bg-[#FDF7F9] rounded-xl flex items-center justify-between gap-3 border border-[#EFEAEF] transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {usr.avatarUrl ? (
                            <img
                              src={usr.avatarUrl}
                              alt={usr.name}
                              className="w-8 h-8 rounded-full object-cover border border-[#6B4355]"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#6B4355]/10 text-[#6B4355] font-extrabold text-xs flex items-center justify-center">
                              {usr.name ? usr.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-[#2D2329] block truncate">
                              {usr.name}
                            </span>
                            <span className="text-[10px] text-[#8C7A87] font-medium block truncate">
                              {usr.email} {usr.phone ? `• ${usr.phone}` : ''}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLinkGuardian(usr)}
                          disabled={isAlreadyLinked || formData.guardians.length >= 3}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all shrink-0 ${
                            isAlreadyLinked
                              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                              : 'bg-[#6B4355] text-white hover:bg-[#543343] active:scale-95 shadow-xs'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isAlreadyLinked ? 'Linked ✓' : 'Link as Guardian'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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
