import React from 'react';

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = 'h-11 w-11' }) => (
  <img
    src="/logo_iso.png"
    alt="Logo ISO"
    className={`object-contain ${className}`}
  />
);

interface BrandLockupProps {
  compact?: boolean;
  inverse?: boolean;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({
  compact = false,
  inverse = false,
}) => {
  const eyebrowClass = inverse ? 'text-white/55' : 'text-slate-400';
  const titleClass = inverse ? 'text-white' : 'text-slate-800';
  const subtitleClass = inverse ? 'text-white/75' : 'text-slate-500';

  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'min-w-0'}`}>
      <div
        className={`flex items-center justify-center overflow-hidden rounded-[18px] ${
          inverse ? 'bg-white/10 p-1.5' : 'bg-white p-1.5 shadow-sm ring-1 ring-slate-200'
        }`}
      >
        <BrandMark className={compact ? 'h-10 w-10' : 'h-12 w-12'} />
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-bold uppercase tracking-[0.32em] ${eyebrowClass}`}>
          Servasmar
        </p>
        <h1 className={`truncate text-lg font-extrabold ${titleClass}`}>SIG ISO</h1>
        {!compact && (
          <p className={`truncate text-xs font-medium ${subtitleClass}`}>
            Sistema Integrado de Gestion
          </p>
        )}
      </div>
    </div>
  );
};
