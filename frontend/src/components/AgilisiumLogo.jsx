import React from 'react';

export default function AgilisiumLogo({ size = 'md', className = '' }) {
  // Dimension height scaling
  const hSize = size === 'lg' ? 'h-14' : size === 'sm' ? 'h-9' : 'h-11';

  return (
    <div className={`inline-flex items-center justify-center bg-white p-1.5 rounded-2xl shadow-md border border-slate-200 hover:scale-[1.03] transition-all cursor-pointer ${className}`}>
      {/* Pure Logo Image Badge — No text */}
      <img
        src="/agilisium_logo.jpg"
        alt="Agilisium Logo"
        className={`${hSize} w-auto object-contain rounded-xl shrink-0`}
      />
    </div>
  );
}
