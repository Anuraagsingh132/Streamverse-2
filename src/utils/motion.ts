import type { Variants } from 'motion/react';

/**
 * Streamverse Motion System Tokens & Variants
 * High-performance, GPU-friendly animation tokens with carefully tuned cubic-bezier curves.
 */

// Tuned easing curves
export const EASINGS = {
  // Apple/iOS style smooth exponential deceleration
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
  // Smooth natural symmetric easing for state toggles
  easeInOutSmooth: [0.4, 0, 0.2, 1] as const,
  // Snappy deceleration for micro-interactions & clicks
  easeOutQuad: [0.25, 1, 0.5, 1] as const,
  // Fluid spring configuration
  springSmooth: { type: 'spring' as const, stiffness: 450, damping: 35 },
  springSnappy: { type: 'spring' as const, stiffness: 500, damping: 30 },
  springGentle: { type: 'spring' as const, stiffness: 350, damping: 30 },
};

// Common reusable motion variants
export const pageMotionVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.16, ease: [0.25, 1, 0.5, 1] } },
};

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } },
};

export const modalContentVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.96, y: 6, transition: { duration: 0.16, ease: [0.25, 1, 0.5, 1] } },
};

export const dropdownMenuVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.96, y: -2, transition: { duration: 0.12, ease: [0.25, 1, 0.5, 1] } },
};

export const drawerVariants: Variants = {
  initial: { x: '100%', opacity: 0.8 },
  animate: { x: 0, opacity: 1, transition: { type: 'spring', damping: 32, stiffness: 380 } },
  exit: { x: '100%', opacity: 0.8, transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] } },
};

export const heroContentVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] } },
};

// Micro-interaction presets
export const tapScaleSubtle = { scale: 0.96 };
export const tapScaleButton = { scale: 0.93 };
export const tapScaleIcon = { scale: 0.88 };

export const hoverScaleCard = { scale: 1.02, y: -3 };
