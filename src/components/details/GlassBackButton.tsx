import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export interface GlassBackButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Modern glassmorphic back button with responsive touch target,
 * tactile spring physics, and accessible keyboard focus state.
 */
export const GlassBackButton: React.FC<GlassBackButtonProps> = ({
  onClick,
  label = 'Back',
  className = '',
}) => {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 sm:bg-black/40 text-white backdrop-blur-xl px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.6)] transition-all hover:bg-white/20 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${className}`}
      title={label}
      aria-label={`${label} to previous page`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </motion.button>
  );
};
