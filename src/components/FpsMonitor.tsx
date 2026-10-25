import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, AlertTriangle, Copy, Trash2, ChevronDown, ChevronUp, Check, ExternalLink, Download } from 'lucide-react';
import { fpsLogger, FpsDropEvent } from '../services/fpsLogger';

const DropLogsList: React.FC<{ dropLogs: FpsDropEvent[]; targetFps: number }> = React.memo(({ dropLogs, targetFps }) => {
  if (dropLogs.length === 0) {
    return (
      <div className="p-6 text-center text-white/50 space-y-1">
        <p className="text-emerald-400 font-semibold text-xs">Zero Frame Drops Detected</p>
        <p className="text-[11px]">Framerate is maintaining locked {targetFps} FPS.</p>
      </div>
    );
  }

  return (
    <>
      {dropLogs.map((log) => (
        <div
          key={log.id}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 space-y-1.5 transition-colors hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-300">
              {log.frameDurationMs}ms <span className="text-white/50 text-[10px]">({log.droppedFrames} drop{log.droppedFrames > 1 ? 's' : ''})</span>
            </span>
            <span className="text-white/40 text-[10px]">{log.timeFormatted}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="text-white/40">Path:</span>
            <span className="truncate max-w-[200px] text-white font-medium bg-white/10 px-1 rounded text-[10px]">
              {log.path}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-white/60">
            <span className="text-white/40">Action:</span>
            <span className="truncate text-rose-300/90 font-medium">
              {log.recentAction}
            </span>
          </div>
        </div>
      ))}
    </>
  );
});

export const FpsMonitor: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('fps') === 'true' || urlParams.get('fps') === '1') return true;
        return localStorage.getItem('streamverse_show_fps') === 'true';
      }
    } catch {}
    return false;
  });

  const [fps, setFps] = useState<number>(60);
  const [frameTime, setFrameTime] = useState<number>(16.6);
  const [targetFps, setTargetFps] = useState<number>(() => fpsLogger.getTargetFps());
  const [position, setPosition] = useState<'bottom-right' | 'top-right' | 'bottom-left'>('bottom-right');
  const [dropLogs, setDropLogs] = useState<FpsDropEvent[]>([]);
  const [isLogsExpanded, setIsLogsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Subscribe to FPS Logger drops and target refresh rate updates
  useEffect(() => {
    const unsubscribe = fpsLogger.subscribe((logs) => {
      setDropLogs(logs);
      setTargetFps(fpsLogger.getTargetFps());
    });
    return unsubscribe;
  }, []);

  // Listen for storage changes & custom toggle event
  useEffect(() => {
    const handleStorage = () => {
      try {
        const val = localStorage.getItem('streamverse_show_fps') === 'true';
        setIsOpen(val);
      } catch {}
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('toggle-fps-monitor', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('toggle-fps-monitor', handleStorage);
    };
  }, []);

  // Keyboard shortcut: Shift + F to toggle anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.shiftKey &&
        e.key.toLowerCase() === 'f' &&
        !['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())
      ) {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          try {
            localStorage.setItem('streamverse_show_fps', String(next));
            window.dispatchEvent(new Event('toggle-fps-monitor'));
          } catch {}
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Start/stop fpsLogger service based on isOpen
  useEffect(() => {
    if (isOpen) {
      fpsLogger.start();
    } else {
      fpsLogger.stop();
    }
  }, [isOpen]);

  // Real-time HUD RAF sampling loop
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastSampleTime = lastTime;

    const tick = (now: number) => {
      lastTime = now;
      frameCount++;

      // Sample every 400ms for stable readability
      if (now - lastSampleTime >= 400) {
        // Zero React re-renders while user is actively scrolling
        if (typeof window !== 'undefined' && Boolean((window as any).__IS_SCROLLING__)) {
          lastSampleTime = now;
          frameCount = 0;
          animId = requestAnimationFrame(tick);
          return;
        }

        const currentFps = Math.round((frameCount * 1000) / (now - lastSampleTime));
        const avgFrameTime = Number((1000 / Math.max(1, currentFps)).toFixed(1));
        setFps(currentFps);
        setFrameTime(avgFrameTime);
        fpsLogger.setDetectedTargetFps(currentFps);
        setTargetFps(fpsLogger.getTargetFps());
        frameCount = 0;
        lastSampleTime = now;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusColor = () => {
    const ratio = fps / targetFps;
    if (ratio >= 0.92) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (ratio >= 0.70) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  };

  const getDotColor = () => {
    const ratio = fps / targetFps;
    if (ratio >= 0.92) return 'bg-emerald-400';
    if (ratio >= 0.70) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  const getPosClass = () => {
    switch (position) {
      case 'top-right':
        return 'top-20 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
      default:
        return 'bottom-4 right-4';
    }
  };

  const cyclePosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition((prev) => {
      if (prev === 'bottom-right') return 'bottom-left';
      if (prev === 'bottom-left') return 'top-right';
      return 'bottom-right';
    });
  };

  const handleCopyLogs = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        targetFps,
        totalLoggedDrops: dropLogs.length,
        events: dropLogs
      },
      null,
      2
    );

    let success = false;
    // Primary: modern clipboard API
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(formatted);
        success = true;
      } catch (err) {
        console.warn('Clipboard writeText failed, attempting execCommand fallback:', err);
      }
    }

    // Fallback: hidden textarea with document.execCommand('copy')
    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = formatted;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.error('Textarea copy fallback error:', err);
      }
    }

    // Always log to DevTools console for instant manual inspection
    console.log('[Streamverse FPS Audit Logs]', {
      targetFps,
      totalDrops: dropLogs.length,
      logs: dropLogs
    });
    if (console.table) {
      console.table(dropLogs);
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        targetFps,
        totalLoggedDrops: dropLogs.length,
        events: dropLogs
      },
      null,
      2
    );
    const blob = new Blob([formatted], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `streamverse-fps-drops-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed ${getPosClass()} z-[99999] flex flex-col items-end gap-2 select-none font-mono`}>
      {/* Expandable Drop Inspection Drawer */}
      {isLogsExpanded && (
        <div
          role="region"
          aria-label="Framerate Drop Audit Logs"
          className="w-80 sm:w-96 max-h-[380px] flex flex-col rounded-2xl border border-white/20 bg-zinc-950 p-3.5 text-xs text-white shadow-2xl select-text"
          style={{
            boxShadow: '0 16px 48px 0 rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-white text-[13px]">FPS Drop Audit Log</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                {dropLogs.length} events
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyLogs}
                title="Copy JSON drop report (also prints to DevTools console)"
                className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/90 hover:bg-white/20 transition cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadLogs}
                title="Download JSON report file"
                className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/90 hover:bg-white/20 transition cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fpsLogger.clearLogs()}
                title="Clear all logs"
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 text-white/60 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Subheader info */}
          <div className="py-2 text-[10px] text-white/60 flex items-center justify-between">
            <span>Target: {targetFps}Hz (Budget: {(1000 / targetFps).toFixed(1)}ms)</span>
            <span className="text-amber-400/90 font-medium">Logged whenever frame &gt; 1.6× budget</span>
          </div>

          {/* Log List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-1 overscroll-contain [scrollbar-width:thin]">
            {dropLogs.length === 0 ? (
              <div className="p-6 text-center text-white/50 space-y-1">
                <p className="text-emerald-400 font-semibold text-xs">Zero Frame Drops Detected</p>
                <p className="text-[11px]">Framerate is maintaining locked {targetFps} FPS.</p>
              </div>
            ) : (
              dropLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 space-y-1.5 transition-colors hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-amber-300">
                      {log.frameDurationMs}ms <span className="text-white/50 text-[10px]">({log.droppedFrames} drop{log.droppedFrames > 1 ? 's' : ''})</span>
                    </span>
                    <span className="text-white/40 text-[10px]">{log.timeFormatted}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-white/80">
                    <span className="text-white/40">Path:</span>
                    <span className="truncate max-w-[200px] text-white font-medium bg-white/10 px-1 rounded text-[10px]">
                      {log.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-white/60">
                    <span className="text-white/40">Action:</span>
                    <span className="truncate text-rose-300/90 font-medium">
                      {log.recentAction}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main HUD Pill */}
      <div
        role="status"
        aria-label="Real-time framerate monitor"
        className="flex items-center gap-2.5 rounded-full border border-white/20 bg-black/90 px-3.5 py-1.5 text-xs font-mono font-medium text-white shadow-2xl backdrop-blur-xl transition-all duration-200"
        style={{
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }}
      >
        {/* FPS Value with pulsing status dot & reposition on click */}
        <div
          onClick={cyclePosition}
          title="Click to reposition HUD (bottom-right / bottom-left / top-right)"
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-85"
        >
          <span className={`h-2 w-2 rounded-full ${getDotColor()} animate-pulse`} />
          <span className="font-bold text-white text-[13px] tracking-tight">{fps} FPS</span>
        </div>

        <span className="h-3 w-px bg-white/20" />

        {/* Frame Time */}
        <span className="text-white/70 text-[11px]" title="Average frame duration">{frameTime}ms</span>

        <span className="h-3 w-px bg-white/20" />

        {/* Health Badge */}
        <span
          title={`Detected display refresh rate: ${targetFps}Hz`}
          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getStatusColor()}`}
        >
          {targetFps}Hz
        </span>

        {/* Interactive Drop Log Trigger */}
        <button
          type="button"
          onClick={() => setIsLogsExpanded((prev) => !prev)}
          title={dropLogs.length > 0 ? "Click to view FPS drop audit logs" : "No drops recorded"}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border transition cursor-pointer ${
            dropLogs.length > 0
              ? 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          <span>{dropLogs.length} drops</span>
          {isLogsExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />}
        </button>

        {/* Close button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setIsLogsExpanded(false);
            try {
              localStorage.setItem('streamverse_show_fps', 'false');
              window.dispatchEvent(new Event('toggle-fps-monitor'));
            } catch {}
          }}
          title="Close FPS HUD (Toggle anytime with Shift + F)"
          aria-label="Close FPS HUD"
          className="ml-1 rounded-full p-0.5 text-white/50 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default FpsMonitor;
