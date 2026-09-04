import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Radio,
  Trash2,
  MapPin,
  Sparkles,
} from 'lucide-react';

export const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo user credentials
  const fillDemoAccount = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 md:p-8 bg-[#FAF4F8] relative overflow-hidden">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#FDE8EC] rounded-full blur-3xl opacity-60 animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#EAD9E3] rounded-full blur-3xl opacity-50 animate-pulse"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Brand Hero Banner & Feature Status Cards (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 hidden lg:block pr-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="PATHPROHORI Logo"
              className="w-12 h-12 object-contain drop-shadow-md hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-extrabold tracking-widest text-slate-900 font-display">
              PATHPROHORI
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-black text-slate-900 leading-tight font-display">
              Commuter Security & Hyperlocal Transit Ecosystem
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-3 leading-relaxed">
              Protecting passengers across daily travel with continuous signal loss monitoring, 48-hour privacy data purging, and interactive danger mapping.
            </p>
          </div>

          {/* Feature Status Cards - Unified Light Theme Icons */}
          <div className="space-y-3 pt-2">
            <div className="p-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-card flex items-center gap-3.5 transform hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60 shadow-2xs">
                <Radio className="w-5 h-5 animate-pulse text-rose-600" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-slate-900 font-display">
                  Signal Loss Heartbeat Tracker
                </h5>
                <p className="text-[11px] text-slate-500 font-medium">
                  2-Minute timeout auto-triggers alert
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-card flex items-center gap-3.5 transform hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60 shadow-2xs">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-slate-900 font-display">
                  48-Hour Privacy Eraser
                </h5>
                <p className="text-[11px] text-slate-500 font-medium">
                  Zero permanent GPS logs
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-card flex items-center gap-3.5 transform hover:-translate-y-0.5 transition-transform">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60 shadow-2xs">
                <MapPin className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h5 className="text-xs font-extrabold text-slate-900 font-display">
                  Crowdsourced Danger Feed
                </h5>
                <p className="text-[11px] text-slate-500 font-medium">
                  Verified safety heatmap
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Aesthetic Glassmorphism Login Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-8 md:p-10 border border-slate-200/80 shadow-card hover:shadow-2xl transition-all">
          {/* Header Icon */}
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/logo.png"
              alt="PATHPROHORI Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain mb-2 drop-shadow-md transform hover:scale-105 transition-transform"
            />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">Welcome Back</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Access your PATHPROHORI Commuter Safety Ecosystem
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold text-center border border-rose-200 animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-display mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-600 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@pathprohori.com"
                  className="w-full bg-slate-50 text-sm text-slate-900 font-medium pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-display mb-1.5">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-600 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 text-sm text-slate-900 font-medium pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-700 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/20 active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer btn-shiny-effect group"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 ease-in-out group-hover:translate-x-1" />
            </button>
          </form>

          {/* Quick Demo Login Chips */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5 font-display">
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              Quick Demo Accounts
            </span>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <button
                onClick={() =>
                  fillDemoAccount('saqline.hossain@g.bracu.ac.bd', 'Saqline2026!')
                }
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 transition-all text-[11px] cursor-pointer"
              >
                Saqline (Commuter)
              </button>
              <button
                onClick={() =>
                  fillDemoAccount('badrunnaher.pantho@g.bracu.ac.bd', 'Pantho2026!')
                }
                className="px-3 py-1.5 bg-[#FDE8EC] hover:bg-[#F9C5D1] text-[#D93856] rounded-xl border border-[#F9C5D1] transition-all text-[11px] cursor-pointer"
              >
                Pantho (Guardian)
              </button>
              <button
                onClick={() =>
                  fillDemoAccount('mehedi.hasan.shovon@g.bracu.ac.bd', 'Shovon2026!')
                }
                className="px-3 py-1.5 bg-[#FFF3E0] hover:bg-[#FFE0B2] text-[#D97706] rounded-xl border border-[#FFE0B2] transition-all text-[11px] cursor-pointer"
              >
                Shovon (Operator)
              </button>
              <button
                onClick={() =>
                  fillDemoAccount('jamshedul.alam@g.bracu.ac.bd', 'Hridoy2026!')
                }
                className="px-3 py-1.5 bg-[#F3E8FF] hover:bg-[#E9D5FF] text-[#7E22CE] rounded-xl border border-[#E9D5FF] transition-all text-[11px] cursor-pointer"
              >
                Hridoy (Admin)
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs font-medium text-slate-500 font-display">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-extrabold text-rose-600 hover:underline"
            >
              Create Commuter Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
