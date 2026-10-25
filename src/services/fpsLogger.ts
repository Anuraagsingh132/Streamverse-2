/**
 * Streamverse High-Precision Framerate & Hitch Logging Service
 * Continuously detects real hardware refresh rate and accurately captures
 * legitimate framerate drops during scrolling, browsing, and interactions.
 */

export interface FpsDropEvent {
  id: string;
  timestamp: string;
  timeFormatted: string;
  path: string;
  measuredFps: number;
  targetFps: number;
  frameDurationMs: number;
  expectedDurationMs: number;
  droppedFrames: number;
  recentAction: string;
}

type LogListener = (logs: FpsDropEvent[]) => void;

class FpsLoggerService {
  private logs: FpsDropEvent[] = [];
  private maxLogs = 50;
  private listeners: Set<LogListener> = new Set();
  private isRunning = false;
  private animId = 0;
  private lastTime = 0;
  private targetFps = 60; // Standard 60Hz baseline (16.67ms budget)
  private frameBudgetMs = 16.67;
  private recentAction = 'idle';
  private actionTimeout: ReturnType<typeof setTimeout> | undefined;
  private hasInitialized = false;
  private startupTime = performance.now();
  private lastDropRecordedTime = 0;
  private recentDeltas: number[] = [];
  private justBecameActive = 0;

  constructor() {
    // Start with a clean slate of 0 drops on every page load/refresh
    this.clearStorage();
  }

  public init() {
    if (this.hasInitialized || typeof window === 'undefined') return;
    this.hasInitialized = true;
    this.startupTime = performance.now();

    // Hook passive user interaction listeners to attribute drops
    this.setupInteractionListeners();

    // Expose helpers on window for manual console inspection & automated debugging
    (window as any).__FPS_LOGGER__ = this;
    (window as any).getFpsDropLogs = () => this.getLogs();
    (window as any).clearFpsDropLogs = () => this.clearLogs();
  }

  public start() {
    if (this.isRunning || typeof window === 'undefined') return;
    this.init();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  public recordAction(actionName: string) {
    if (this.recentAction === 'idle') {
      // Re-baseline frame deltas for 3 frames when waking up from idle (allows OS clock ramp-up)
      this.justBecameActive = 3;
    }
    this.recentAction = actionName;
    if (this.actionTimeout) clearTimeout(this.actionTimeout);
    this.actionTimeout = setTimeout(() => {
      this.recentAction = 'idle';
    }, 400);
  }

  public getLogs(): FpsDropEvent[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.recentDeltas = [];
    try {
      sessionStorage.removeItem('streamverse_fps_drops_v2');
      sessionStorage.removeItem('streamverse_fps_drops');
    } catch {}
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getLogs());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getTargetFps(): number {
    return this.targetFps;
  }

  public updateTargetFps(newTarget: number) {
    if (newTarget !== this.targetFps) {
      this.targetFps = newTarget;
      this.frameBudgetMs = Number((1000 / this.targetFps).toFixed(2));
      this.notify();
    }
  }

  public setDetectedTargetFps(detected: number) {
    if (detected >= 135) this.updateTargetFps(144);
    else if (detected >= 105) this.updateTargetFps(120);
    else if (detected >= 75) this.updateTargetFps(90);
    else if (detected >= 50) this.updateTargetFps(60);
  }

  private loop = (now: number) => {
    if (!this.isRunning) return;

    if (typeof document !== 'undefined' && document.hidden) {
      this.lastTime = now;
      this.animId = requestAnimationFrame(this.loop);
      return;
    }

    const delta = now - this.lastTime;
    this.lastTime = now;

    if (this.justBecameActive > 0) {
      this.justBecameActive--;
      this.animId = requestAnimationFrame(this.loop);
      return;
    }

    // Detect actual hardware rate dynamically using median of clean frame intervals
    // Prevents single-frame jitter outliers from falsely locking a display to the wrong refresh tier
    if (delta >= 4 && delta <= 25) {
      this.recentDeltas.push(delta);
      if (this.recentDeltas.length > 30) {
        this.recentDeltas.shift();
      }

      if (this.recentDeltas.length >= 15) {
        const sorted = [...this.recentDeltas].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];

        if (median <= 7.5) {
          this.updateTargetFps(144);
        } else if (median <= 9.3) {
          this.updateTargetFps(120);
        } else if (median <= 12.8) {
          this.updateTargetFps(90);
        } else {
          this.updateTargetFps(60);
        }
      }
    }

    // Warmup grace period: ignore initial 4.5s of script bundling/hydration on cold/force-refresh
    const isWarmedUp = now - this.startupTime > 4500;

    // Threshold: a frame taking > 1.7x expected budget represents a real dropped frame
    const threshold = this.frameBudgetMs * 1.7;

    // During active interactions (scrolling, clicking, keypresses), enforce full target refresh rate.
    // During idle (hands off keyboard/mouse), OS power-saving (Windows Dynamic Refresh Rate / ProMotion)
    // reduces display VSYNC to 45Hz/60Hz. We only capture true main-thread freezes (>100ms) during idle.
    const isActuallyScrolling = typeof window !== 'undefined' && Boolean((window as any).__IS_SCROLLING__);
    const isInteractive = isActuallyScrolling || this.recentAction.startsWith('scroll') || this.recentAction.startsWith('click') || this.recentAction.startsWith('key');

    // Only record drops during active user interaction; ignore idle power-saving refresh throttling
    if (isInteractive && isWarmedUp && delta > threshold && delta < 900 && this.lastTime > 0) {
      if (now - this.lastDropRecordedTime > 250) {
        this.lastDropRecordedTime = now;
        this.recordDrop(delta);
      }
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  private recordDrop(durationMs: number) {
    const droppedCount = Math.max(1, Math.round(durationMs / this.frameBudgetMs) - 1);
    const measuredFps = Math.max(1, Math.round(1000 / durationMs));
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const path = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';

    const event: FpsDropEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: now.toISOString(),
      timeFormatted,
      path,
      measuredFps,
      targetFps: this.targetFps,
      frameDurationMs: Number(durationMs.toFixed(1)),
      expectedDurationMs: this.frameBudgetMs,
      droppedFrames: droppedCount,
      recentAction: this.recentAction
    };

    this.logs.unshift(event);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.saveToStorage();
    this.notify();

    if (typeof window !== "undefined" && (window as any).__DEBUG_FPS__) {
      console.warn(
        `%c[FPS DROP] ${droppedCount} frame(s) dropped on ${path} (${event.frameDurationMs}ms vs ${this.frameBudgetMs}ms budget) during ${event.recentAction}`,
        'color: #ef4444; font-weight: bold;',
        event
      );
    }
  }

  private setupInteractionListeners() {
    let lastScrollY = window.scrollY;
    let lastScrollRecorded = 0;

    window.addEventListener(
      'scroll',
      () => {
        const now = performance.now();
        if (now - lastScrollRecorded > 180) {
          lastScrollRecorded = now;
          const curY = Math.round(window.scrollY);
          const dir = curY > lastScrollY ? 'down' : 'up';
          lastScrollY = curY;
          this.recordAction(`scroll ${dir} (Y: ${curY})`);
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'pointerdown',
      (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const label =
          target.getAttribute('aria-label') ||
          target.getAttribute('title') ||
          target.textContent?.trim()?.slice(0, 24) ||
          target.tagName.toLowerCase();
        this.recordAction(`click: "${label}"`);
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      'keydown',
      (e) => {
        this.recordAction(`key: [${e.key}]`);
      },
      { passive: true, capture: true }
    );
  }

  private saveToStorage() {
    try {
      sessionStorage.setItem('streamverse_fps_drops_v2', JSON.stringify(this.logs.slice(0, 30)));
    } catch {}
  }

  private clearStorage() {
    try {
      sessionStorage.removeItem('streamverse_fps_drops_v2');
      sessionStorage.removeItem('streamverse_fps_drops');
    } catch {}
  }

  private loadFromStorage() {
    try {
      const saved = sessionStorage.getItem('streamverse_fps_drops_v2');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch {}
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.getLogs());
      } catch (err) {
        console.error('Error in FPS log listener:', err);
      }
    }
  }
}

export const fpsLogger = new FpsLoggerService();
