import { useEffect, useRef } from 'react';

/**
 * Traps keyboard focus within an active modal container and restores focus on close.
 * Complies with WCAG 2.2 AA modal guidelines.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(isActive: boolean) {
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Save active element to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    // Delayed focus to let animations start and elements mount
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const focusableElements = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter(
        (el) => !el.hasAttribute('disabled') && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden'
      );
      if (containerRef.current.getAttribute('tabindex') === '-1') {
        containerRef.current.focus({ preventScroll: true });
      } else if (focusableElements.length > 0) {
        focusableElements[0].focus({ preventScroll: true });
      } else {
        containerRef.current.focus({ preventScroll: true });
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (!containerRef.current) return;

      const elements = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter(
        (el) => !el.hasAttribute('disabled') && window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden'
      );

      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || !containerRef.current.contains(document.activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement || !containerRef.current.contains(document.activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        try {
          previousFocusRef.current.focus();
        } catch {
          // ignore
        }
      }
    };
  }, [isActive]);

  return containerRef;
}
