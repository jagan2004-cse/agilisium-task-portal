import React, { useState } from 'react';
import { Mail, Lock, KeyRound, X, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { authAPI } from '../api';
import OTPVerificationModal from './OTPVerificationModal';

export default function ForgotPasswordModal({ isOpen, onClose, onSwitchToLogin }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@agilisium.com')) {
      setErrorMsg('Please enter a valid company email (@agilisium.com).');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await authAPI.forgotPasswordRequest({ email: cleanEmail });
      setStep(2);
    } catch (err) {
      setErrorMsg(err.response?.data?.email?.[0] || err.response?.data?.detail || 'No account found with this email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSuccess = (code) => {
    setOtpCode(code);
    setStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authAPI.forgotPasswordReset({
        email: email.trim().toLowerCase(),
        otp_code: otpCode,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      setSuccessMsg(res.data.message || 'Password changed successfully! You can now sign in.');
      setTimeout(() => {
        onClose();
        if (onSwitchToLogin) onSwitchToLogin();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.response?.data?.confirm_password?.[0] || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
        <div className="glass-card w-full max-w-md rounded-3xl p-6 sm:p-8 bg-slate-900 border border-slate-700 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/10">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-wider">Reset Password</h2>
            <p className="text-xs text-slate-300 mt-1">
              {step === 1 && "Enter your company email to receive a password reset OTP code"}
              {step === 3 && "Set your new secure account password"}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Enter Company Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Company Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@agilisium.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-medium"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-extrabold text-sm hover:from-teal-400 hover:to-cyan-400 transition shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Reset OTP Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 font-medium"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-extrabold text-sm hover:from-teal-400 hover:to-cyan-400 transition shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Update Password & Sign In</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs">
            <button
              onClick={() => {
                onClose();
                if (onSwitchToLogin) onSwitchToLogin();
              }}
              className="text-teal-400 hover:underline font-bold cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>

      {/* STEP 2: OTP Verification Modal */}
      {step === 2 && (
        <OTPVerificationModal
          email={email.trim().toLowerCase()}
          purpose="RESET"
          onSuccess={handleOTPSuccess}
          onClose={() => setStep(1)}
        />
      )}
    </>
  );
}
