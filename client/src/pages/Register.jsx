import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, User, Mail, Lock, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    gender: 'female',
    role: 'commuter',
    emergencyPhrase: 'Lavender Moonlight',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#FAF4F8] relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#FDE8EC] rounded-full blur-3xl opacity-60 animate-pulse"></div>
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#EAD9E3] rounded-full blur-3xl opacity-50 animate-pulse"></div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-8 border border-[#EFEAEB] shadow-card relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/logo.png"
            alt="PATHPROHORI Logo"
            className="w-16 h-16 object-contain mb-2 drop-shadow-md transform hover:scale-105 transition-transform"
          />
          <h2 className="text-2xl font-extrabold text-[#2D2329]">Create Account</h2>
          <p className="text-xs font-semibold text-[#8C8289] mt-1">
            Join the PATHPROHORI Commuter Protection Network
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[#FDE8EC] text-[#E05370] text-xs font-semibold text-center border border-[#F9C5D1]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-display mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Md Saqline Hossain"
                className="w-full bg-slate-50 text-sm text-slate-900 font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-display mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="saqline@bracu.ac.bd"
                className="w-full bg-slate-50 text-sm text-slate-900 font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-display mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+880 1700-000000"
                className="w-full bg-slate-50 text-sm text-slate-900 font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-display mb-1">
              Gender Identification
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full bg-slate-50 text-sm text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white transition-all font-semibold"
            >
              <option value="female">Female ♀</option>
              <option value="male">Male ♂</option>
              <option value="other">Other / Prefer not to say ⚧</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-display mb-1">
              Register Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-slate-50 text-sm text-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white transition-all font-semibold"
            >
              <option value="commuter">Commuter (Passenger)</option>
              <option value="guardian">Guardian (Emergency Contact)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-display mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-slate-50 text-sm text-slate-900 font-medium pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer btn-shiny-effect group"
          >
            {loading ? 'Registering...' : 'Create Account'}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
          </button>
        </form>

        <div className="mt-5 text-center text-xs font-medium text-slate-500 font-display">
          Already have an account?{' '}
          <Link to="/login" className="font-extrabold text-rose-600 hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};
