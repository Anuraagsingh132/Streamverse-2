import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface GlassBackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Modern glassmorphic back button with responsive touch target,
 * hover glow, and accessible keyboard focus state.
 */
export const GlassBackButton: React.FC<GlassBackButtonProps> = ({
  onClick,
  label = 'Back',
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 shadow-lg ${className}`}
      title={label}
      aria-label={`${label} to previous page`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
};
