import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, UserPlus, KeyRound, AlertTriangle } from 'lucide-react';
import { authAPI } from '../api';
import AgilisiumLogo from './AgilisiumLogo';
import SignupModal from './SignupModal';
import ForgotPasswordModal from './ForgotPasswordModal';
import OTPVerificationModal from './OTPVerificationModal';

export default function LoginModal({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showVerifyOTP, setShowVerifyOTP] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(email.trim().toLowerCase(), password);
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      onLoginSuccess(res.data.user);
    } catch (err) {
      if (err.response?.data?.email_unverified) {
        setUnverifiedEmail(err.response.data.email || email.trim().toLowerCase());
        setShowVerifyOTP(true);
      } else {
        setError(err.response?.data?.detail || 'Invalid login credentials. Check email & password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051923]">
        <div className="w-full max-w-md bg-[#09222f] rounded-3xl p-8 shadow-2xl border border-[#144052] relative overflow-hidden">
          {/* Glow backdrop spots */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#56e3ce]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-[#005f73]/40 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center justify-center mb-6 text-center">
            <AgilisiumLogo size="lg" className="mb-4" />
            <h2 className="text-2xl font-black text-[#56e3ce] tracking-wider uppercase">TASKSPRINT</h2>
            <p className="text-xs text-slate-300 mt-1">Agilisium Evidence & Sprint Tracking Portal</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-center font-medium flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Company Email</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@agilisium.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#061b27] border border-[#18485e] text-sm outline-none placeholder-slate-500 text-white focus:border-[#56e3ce] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-semibold text-[#56e3ce] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#061b27] border border-[#18485e] text-sm outline-none placeholder-slate-500 text-white focus:border-[#56e3ce] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#005f73] to-[#0a9396] hover:from-[#0a9396] hover:to-[#94d2bd] shadow-lg shadow-[#0a9396]/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? 'Authenticating...' : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Signup Trigger Link */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs">
            <span className="text-slate-400">Don't have an account? </span>
            <button
              onClick={() => setShowSignup(true)}
              className="text-[#56e3ce] font-extrabold hover:underline cursor-pointer"
            >
              Create Account / Sign Up
            </button>
          </div>
        </div>
      </div>

      {/* Signup Modal */}
      {showSignup && (
        <SignupModal
          isOpen={showSignup}
          onClose={() => setShowSignup(false)}
          onSwitchToLogin={() => setShowSignup(false)}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          onSwitchToLogin={() => setShowForgotPassword(false)}
        />
      )}

      {/* Unverified Email OTP Modal */}
      {showVerifyOTP && (
        <OTPVerificationModal
          email={unverifiedEmail}
          purpose="VERIFY"
          onSuccess={() => {
            setShowVerifyOTP(false);
            setError('');
          }}
          onClose={() => setShowVerifyOTP(false)}
        />
      )}
    </>
  );
}
