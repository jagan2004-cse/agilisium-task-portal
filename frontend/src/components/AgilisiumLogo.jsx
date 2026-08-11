import React from 'react';

export default function AgilisiumLogo({ size = 'md', className = '' }) {
  // Dimension height scaling
  const hSize = size === 'lg' ? 'h-14' : size === 'sm' ? 'h-9' : 'h-11';

  return (
    <div className={`flex items-center gap-3 bg-white px-3 py-1.5 rounded-2xl shadow-xl border border-slate-200 hover:scale-[1.02] transition-all cursor-pointer ${className}`}>
      {/* Exact User Uploaded Image — Raw and Unaltered */}
      <img
        src="/agilisium_logo.jpg"
        alt="Agilisium Logo"
        className={`${hSize} w-auto object-contain rounded-xl shrink-0`}
      />
      <div className="text-left pr-1">
        <span className="text-slate-900 font-extrabold tracking-wider text-sm block leading-none">AGILISIUM</span>
        <span className="text-teal-600 font-bold tracking-widest text-[9px] block mt-0.5 uppercase">Consulting</span>
      </div>
    </div>
  );
}
