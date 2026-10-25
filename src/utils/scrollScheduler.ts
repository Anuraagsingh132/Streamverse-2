/**
 * High-performance UI Task Scheduler
 * Defers heavy React state reconciliations, DOM insertions, and image decodes
 * until active user scrolling settles, preventing framerate drops at 90Hz/120Hz.
 */

type Task = () => void;

export function deferUntilScrollIdle(callback: Task): void {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  const isScrolling = Boolean((window as any).__IS_SCROLLING__);
  if (!isScrolling) {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => callback(), { timeout: 800 });
    } else {
      setTimeout(callback, 16);
    }
    return;
  }

  const onIdle = () => {
    window.removeEventListener('scroll-idle', onIdle);
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => callback(), { timeout: 500 });
    } else {
      setTimeout(callback, 16);
    }
  };

  window.addEventListener('scroll-idle', onIdle, { once: true });
}
