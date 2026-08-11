import React, { useState } from 'react';

export default function AgilisiumLogo({ size = 'md', className = '', theme = 'dark' }) {
  const [imgError, setImgError] = useState(false);

  // Dynamic height sizing
  const hClass = size === 'lg' ? 'h-16' : size === 'sm' ? 'h-9' : 'h-12';

  if (!imgError) {
    return (
      <div className={`flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-xl border border-slate-200 ${className}`}>
        <img
          src="/agilisium_logo.jpg"
          alt="Agilisium Logo"
          onError={() => setImgError(true)}
          className={`${hClass} w-auto object-contain rounded-lg`}
        />
        <div className="text-left">
          <span className="text-slate-900 font-extrabold tracking-wider text-sm block leading-none">AGILISIUM</span>
          <span className="text-teal-600 font-bold tracking-widest text-[9px] block mt-0.5">CONSULTING</span>
        </div>
      </div>
    );
  }

  // Pure SVG Fallback Vector Logo Badge (Guaranteed to NEVER fail)
  return (
    <div className={`flex items-center gap-3 bg-gradient-to-r from-slate-900 via-[#061b27] to-slate-900 px-4 py-2.5 rounded-2xl border border-cyan-500/40 shadow-xl ${className}`}>
      <svg className={`${hClass} w-auto`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="agiGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#56E3CE" />
            <stop offset="50%" stopColor="#0A9396" />
            <stop offset="100%" stopColor="#005F73" />
          </linearGradient>
          <linearGradient id="agiGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#005F73" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        {/* Modern 3D Geometric "A" Emblem */}
        <path d="M50 10 L85 85 L65 85 L50 45 L35 85 L15 85 Z" fill="url(#agiGrad1)" />
        <path d="M50 10 L30 50 L45 50 L50 35 L60 60 L75 60 Z" fill="url(#agiGrad2)" opacity="0.9" />
        <circle cx="50" cy="32" r="5" fill="#56E3CE" />
      </svg>
      <div className="text-left">
        <span className="text-white font-extrabold tracking-wider text-base block leading-none">AGILISIUM</span>
        <span className="text-[#56e3ce] font-bold tracking-widest text-[9px] block mt-0.5">CONSULTING</span>
      </div>
    </div>
  );
}
