import React from 'react';

export default function AgilisiumLogo({ size = 'md', className = '', theme = 'dark' }) {
  // Dimension height scaling
  const hSize = size === 'lg' ? 'h-14' : size === 'sm' ? 'h-9' : 'h-11';
  const iconSize = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

  return (
    <div className={`flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-200 hover:scale-[1.02] transition-all cursor-pointer ${className}`}>
      {/* Exact Official Agilisium Chevron "A" SVG Emblem from User Image */}
      <svg className={`${iconSize} shrink-0`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left Cyan/Teal Arm */}
        <path
          d="M 28 82 C 16 82 10 70 18 58 L 48 18 C 56 6 68 14 62 26 L 32 66 C 26 74 34 82 28 82 Z"
          fill="#00a8b5"
        />
        {/* Right Coral Red Arm */}
        <path
          d="M 72 82 C 84 82 90 70 82 58 L 52 18 C 44 6 32 14 38 26 L 68 66 C 74 74 66 82 72 82 Z"
          fill="#d94b5a"
        />
        {/* Overlapping Apex (Teardrop / Maroon Drop) */}
        <path
          d="M 50 14 C 42 24 38 38 50 56 C 62 38 58 24 50 14 Z"
          fill="#4e262a"
        />
      </svg>

      <div className="text-left">
        <span className="text-slate-900 font-extrabold tracking-wider text-sm block leading-none">AGILISIUM</span>
        <span className="text-[#00a8b5] font-bold tracking-widest text-[9px] block mt-0.5 uppercase">Consulting</span>
      </div>
    </div>
  );
}
