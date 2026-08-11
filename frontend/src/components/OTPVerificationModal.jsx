import React, { useState, useEffect, useRef } from 'react';
import { Mail, KeyRound, ArrowRight, RefreshCw, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { authAPI } from '../api';

export default function OTPVerificationModal({ email, purpose = 'VERIFY', onSuccess, onClose }) {
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpDigits];
    newOtp[index] = value.slice(-1);
    setOtpDigits(newOtp);
    setErrorMessage('');

    // Auto-focus next input box
    if (value && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      inputRefs[5].current.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (purpose === 'RESET') {
        const res = await authAPI.forgotPasswordVerify({ email, otp_code: otpCode, purpose });
        setSuccessMessage(res.data.message || 'Code verified successfully!');
        setTimeout(() => onSuccess && onSuccess(otpCode), 1000);
      } else {
        const res = await authAPI.verifyEmailOTP({ email, otp_code: otpCode, purpose });
        setSuccessMessage(res.data.message || 'Email verified successfully!');
        setTimeout(() => onSuccess && onSuccess(), 1500);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await authAPI.resendOTP({ email, purpose });
      setSuccessMessage(`A new 6-digit code has been sent to ${email}`);
      setCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs[0].current.focus();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card w-full max-w-md rounded-3xl p-6 bg-slate-900 border border-slate-700 shadow-2xl relative">
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
          <h2 className="text-xl font-extrabold text-white tracking-wider">Verify Company Email</h2>
          <p className="text-xs text-slate-300 mt-1">
            We sent a 6-digit code to your Outlook email:
          </p>
          <p className="text-xs font-bold text-teal-400 mt-0.5">{email}</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6 Digit Input Boxes */}
          <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 text-center text-xl font-extrabold bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otpDigits.join('').length !== 6}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-extrabold text-sm hover:from-teal-400 hover:to-cyan-400 transition shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Verify Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Didn't receive the code?</span>
          <button
            onClick={handleResendCode}
            disabled={cooldown > 0 || resending}
            className="text-teal-400 hover:underline font-bold disabled:text-slate-600 disabled:no-underline cursor-pointer flex items-center gap-1"
          >
            {resending ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              'Resend Code'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
