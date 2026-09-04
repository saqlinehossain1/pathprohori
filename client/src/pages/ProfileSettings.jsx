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
  KeyRound,
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

  // Dual-PIN Silent Duress Deactivation setup - kept isolated from the main
  // `formData` object so avatar/guardian updates never resend partially-typed PINs.
  const [pinData, setPinData] = useState({ normalPin: '', fakePin: '' });
  const [savingPins, setSavingPins] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

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
      const updatedData = { ...formData, avatarUrl: url };
      setFormData(updatedData);
      const updatedUser = await authApi.updateProfile(updatedData);
      setUser((prev) => ({ ...prev, ...updatedUser }));
      setStatusMessage('Profile photo uploaded and saved successfully!');
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Profile photo upload failed: ' + (err.response?.data?.message || err.message));
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

  const handleLinkGuardian = async (targetUser) => {
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

    const newGuardiansList = [...formData.guardians, newGuardianEntry];

    setFormData((prev) => ({
      ...prev,
      guardians: newGuardiansList,
    }));

    setSearchQuery('');
    setSearchResults([]);

    try {
      const updatedPayload = { ...formData, guardians: newGuardiansList };
      const updatedUser = await authApi.updateProfile(updatedPayload);
      setUser((prev) => ({ ...prev, ...updatedUser }));
      setStatusMessage(`Linked ${targetUser.name} as Emergency Guardian & saved to database!`);
    } catch (err) {
      console.error('Failed to link guardian:', err);
      alert('Failed to save guardian to database: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateGuardianRelationship = async (index, relationship) => {
    const updated = [...formData.guardians];
    updated[index] = { ...updated[index], relationship };
    setFormData((prev) => ({ ...prev, guardians: updated }));
    try {
      const updatedPayload = { ...formData, guardians: updated };
      const updatedUser = await authApi.updateProfile(updatedPayload);
      setUser((prev) => ({ ...prev, ...updatedUser }));
    } catch (err) {
      console.error('Failed to update relationship:', err);
    }
  };

  const handleRemoveGuardian = async (index) => {
    const updated = formData.guardians.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, guardians: updated }));
    try {
      const updatedPayload = { ...formData, guardians: updated };
      const updatedUser = await authApi.updateProfile(updatedPayload);
      setUser((prev) => ({ ...prev, ...updatedUser }));
      setStatusMessage('Emergency Guardian removed & saved.');
    } catch (err) {
      console.error('Failed to remove guardian:', err);
    }
  };

  const handleSavePins = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinData.normalPin) || !/^\d{4}$/.test(pinData.fakePin)) {
      setPinError('Both PINs must be exactly 4 digits.');
      return;
    }
    if (pinData.normalPin === pinData.fakePin) {
      setPinError('The two PINs must be different.');
      return;
    }
    try {
      setSavingPins(true);
      setPinError('');
      setPinSuccess('');
      const updatedUser = await authApi.updateProfile({
        normalPin: pinData.normalPin,
        fakePin: pinData.fakePin,
      });
      setUser((prev) => ({ ...prev, ...updatedUser }));
      setPinData({ normalPin: '', fakePin: '' });
      setPinSuccess('Alarm deactivation PINs saved securely.');
    } catch (err) {
      console.error('Failed to save deactivation PINs:', err);
      setPinError(err.response?.data?.message || 'Failed to save PINs.');
    } finally {
      setSavingPins(false);
    }
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
      {/* Clean Text Page Header */}
      <div className="mobile-page-header">
        <div className="page-header-kicker inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-extrabold mb-2 border border-slate-200 shadow-2xs">
          <User className="w-3.5 h-3.5 text-rose-600" />
          <span className="font-display">Commuter Safety Account</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
          Profile & Account Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
          Manage your personal commuter avatar, emergency contacts, role permissions, and safety settings.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold rounded-2xl flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar Card & Account Role Info (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="text-center space-y-4 shadow-card border-slate-200/80">
            <div className="relative w-28 h-28 mx-auto">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={formData.name}
                  className="w-full h-full rounded-full object-cover border-4 border-slate-900 shadow-lg"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-900 text-white border-4 border-slate-800 flex items-center justify-center font-black text-3xl shadow-inner font-display">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}

              <label className="absolute bottom-0 right-0 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full cursor-pointer shadow-md transition-all active:scale-95">
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
              <h3 className="font-black text-lg text-slate-900 font-display">{formData.name || 'User'}</h3>
              <p className="text-xs text-slate-500 font-medium">{formData.email}</p>
              <div className="mt-2 inline-block">
                <Badge variant="verified" className="capitalize font-extrabold px-3 py-1">
                  {formData.role} Account
                </Badge>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-700 text-white border border-rose-500 rounded-2xl text-xs font-bold transition-all shadow-md shadow-rose-950/20 w-full justify-center">
                <Upload className="w-4 h-4" />
                <span>{uploadingAvatar ? 'Uploading Profile Photo...' : 'Upload Profile Photo'}</span>
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

          <Card className="space-y-3 bg-gradient-to-br from-slate-50 to-white border-slate-200/80 shadow-card">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider font-display">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Platform Role Access</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Your account has full privileges for Commuter tracking, live hazard reporting, and guardian notification broadcasting.
            </p>
          </Card>
        </div>

        {/* Right Column: Profile Form Details & Guardian List (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="space-y-4 shadow-card border-slate-200/80">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 font-display">
              <User className="w-5 h-5 text-rose-600" />
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
              className="opacity-70 bg-slate-100 cursor-not-allowed"
            />
          </Card>

          <Card className="space-y-4 shadow-card border-slate-200/80">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 font-display">
              <Lock className="w-5 h-5 text-rose-600" />
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
          <Card className="space-y-5 shadow-card border-slate-200/80">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2 font-display">
                <UserCheck className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Emergency Guardians & Connected Accounts
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${formData.guardians.length >= 3
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                {formData.guardians.length} / 3 Guardians Linked
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Connect registered PATHPROHORI user accounts as your official emergency guardians. In the event of a signal-loss heartbeat timeout, automated safety alerts will be broadcast to these connected accounts.
            </p>

            {/* Currently Linked Guardians List */}
            {formData.guardians.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                <UserCheck className="w-8 h-8 text-slate-400 mx-auto opacity-40" />
                <p className="text-xs font-extrabold text-slate-800 font-display">No connected guardians linked yet</p>
                <p className="text-[11px] text-slate-500">Search the registered user database below to link up to 3 guardian accounts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-extrabold text-slate-700 block uppercase tracking-wider font-display">
                  Linked Guardian Accounts ({formData.guardians.length}/3)
                </span>
                {formData.guardians.map((g, idx) => (
                  <div
                    key={g.user || g._id || idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {g.avatarUrl ? (
                        <img
                          src={g.avatarUrl}
                          alt={g.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-slate-900 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-sm border border-slate-800 shrink-0 font-display">
                          {g.name ? g.name.charAt(0).toUpperCase() : 'G'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <span className="font-extrabold text-xs text-slate-900 block truncate font-display">
                          {g.name || 'Guardian User'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block truncate">
                          {g.email || g.phone || 'Connected Platform Account'}
                        </span>
                        {g.phone && (
                          <span className="text-[10px] text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-rose-600" /> {g.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <select
                        value={g.relationship || 'Family'}
                        onChange={(e) => handleUpdateGuardianRelationship(idx, e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
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
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-rose-200 cursor-pointer"
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
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 block uppercase tracking-wider font-display">
                  Search Registered User Database
                </span>
                {formData.guardians.length >= 3 && (
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Max 3 Guardians Limit Reached
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Type name, email, or phone number to search commuter/guardian accounts..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  disabled={formData.guardians.length >= 3}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {searching && (
                <p className="text-xs text-slate-500 font-semibold animate-pulse">
                  Searching database for matching platform accounts...
                </p>
              )}

              {searchError && (
                <p className="text-xs text-rose-600 font-semibold">{searchError}</p>
              )}

              {/* Search Results Dropdown List */}
              {searchResults.length > 0 && (
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto custom-scrollbar p-1 border border-slate-200 rounded-2xl bg-white shadow-md">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-2 py-1 block font-display">
                    Select Account to Link as Guardian ({searchResults.length} found)
                  </span>
                  {searchResults.map((usr) => {
                    const isAlreadyLinked = formData.guardians.some(
                      (g) => (g.user && String(g.user) === String(usr._id)) || g.email === usr.email
                    );
                    return (
                      <div
                        key={usr._id}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between gap-3 border border-slate-100 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {usr.avatarUrl ? (
                            <img
                              src={usr.avatarUrl}
                              alt={usr.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-800"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center font-display">
                              {usr.name ? usr.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="font-extrabold text-xs text-slate-900 block truncate font-display">
                              {usr.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium block truncate">
                              {usr.email} {usr.phone ? `• ${usr.phone}` : ''}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLinkGuardian(usr)}
                          disabled={isAlreadyLinked || formData.guardians.length >= 3}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${isAlreadyLinked
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-xs'
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

          <Button type="submit" loading={saving} size="lg" className="w-full py-4 font-extrabold text-sm shadow-md shadow-rose-950/20">
            <Save className="w-5 h-5 mr-2" />
            Save Profile & Avatar Settings
          </Button>
        </div>
      </form>

      {/* Alarm Deactivation PINs (Dual-PIN Silent Duress Deactivation) */}
      <Card className="space-y-4 shadow-card border-slate-200/80">
        <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 font-display">
          <KeyRound className="w-5 h-5 text-rose-600" />
          Alarm Deactivation PINs
        </h3>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Set two separate 4-digit PINs used to disarm an active emergency alarm. The Deactivation PIN turns
          the alarm off normally. The Silent Alarm PIN looks identical on-screen but secretly escalates the
          alert to maximum priority in the background — use it only if someone is forcing you to disarm the
          alarm.
        </p>

        <form onSubmit={handleSavePins} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={`Deactivation PIN ${user?.hasNormalPin ? '(configured)' : '(not set)'}`}
              type="password"
              inputMode="numeric"
              maxLength="4"
              placeholder="••••"
              value={pinData.normalPin}
              onChange={(e) =>
                setPinData({ ...pinData, normalPin: e.target.value.replace(/\D/g, '') })
              }
              required
            />
            <Input
              label={`Silent Alarm PIN (Duress) ${user?.hasFakePin ? '(configured)' : '(not set)'}`}
              type="password"
              inputMode="numeric"
              maxLength="4"
              placeholder="••••"
              value={pinData.fakePin}
              onChange={(e) =>
                setPinData({ ...pinData, fakePin: e.target.value.replace(/\D/g, '') })
              }
              required
            />
          </div>

          {pinError && <p className="text-xs text-rose-600 font-semibold">{pinError}</p>}
          {pinSuccess && <p className="text-xs text-emerald-600 font-semibold">{pinSuccess}</p>}

          <Button type="submit" loading={savingPins} className="w-full py-3 text-xs font-extrabold">
            <Save className="w-4 h-4 mr-2" />
            Save Deactivation PINs
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ProfileSettings;
