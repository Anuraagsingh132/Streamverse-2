/**
 * Production Security & Anti-Inspection Deterrent
 * 
 * STRICTLY ACTIVE ONLY ON VERCEL / PRODUCTION DEPLOYMENTS.
 * Completely disabled on localhost, 127.0.0.1, and in development mode.
 */

function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return true;

  // Vite development mode flag
  if (import.meta.env.DEV) return true;

  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  );
}

export function initSecurityDefense(): void {
  // Never run in local development
  if (isLocalEnvironment()) {
    return;
  }

  let isDevToolsActive = false;

  const triggerSecurityLockout = () => {
    if (isDevToolsActive) return;
    isDevToolsActive = true;

    // Pause all video/audio playback
    try {
      const mediaElements = document.querySelectorAll('video, audio');
      mediaElements.forEach((el) => {
        try {
          (el as HTMLMediaElement).pause();
          (el as HTMLMediaElement).src = '';
        } catch {}
      });
    } catch {}

    // Replace document with security banner
    try {
      document.body.innerHTML = `
        <div style="display:flex;min-height:100vh;flex-direction:column;align-items:center;justify-content:center;background:#060812;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;text-align:center;user-select:none;">
          <div style="width:64px;height:64px;border-radius:20px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.3);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style="font-size:22px;font-weight:700;margin:0 0 8px 0;letter-spacing:-0.02em;">Developer Options are Disabled</h1>
          <p style="font-size:14px;color:rgba(255,255,255,0.6);max-width:380px;line-height:1.6;margin:0 0 24px 0;">
            Inspection tools and network monitoring are not permitted. Please close developer tools and reload the page to continue.
          </p>
          <button onclick="window.location.reload()" style="background:#ffffff;color:#000000;border:none;border-radius:9999px;padding:10px 24px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity 0.2s;">
            Reload Page
          </button>
        </div>
      `;
    } catch {}

    // Debugger trap to freeze execution in Sources tab
    setInterval(() => {
      /* eslint-disable no-debugger */
      debugger;
    }, 100);
  };

  // 1. Block Context Menu (Right Click)
  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      return false;
    },
    { capture: true }
  );

  // 2. Block DevTools Keyboard Shortcuts
  window.addEventListener(
    'keydown',
    (e) => {
      // F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityLockout();
        return false;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toUpperCase();

      // Ctrl+Shift+I / J / C / K (Inspect / Console / Picker)
      if (isCtrlOrMeta && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerSecurityLockout();
        return false;
      }

      // Ctrl+U / Cmd+Opt+U (View Source)
      if (isCtrlOrMeta && key === 'U') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S / Cmd+S (Save HTML page)
      if (isCtrlOrMeta && key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // 3. Mute & continuously purge all console logs
  const emptyFn = () => {};
  try {
    console.log = emptyFn;
    console.info = emptyFn;
    console.warn = emptyFn;
    console.error = emptyFn;
    console.debug = emptyFn;
    console.dir = emptyFn;
    console.table = emptyFn;
    console.trace = emptyFn;

    setInterval(() => {
      try {
        console.clear();
      } catch {}
    }, 800);
  } catch {}

  // 4. Timing-based Debugger Trap Detection
  // When DevTools is open, hitting a debugger statement causes execution time > 100ms
  const checkDebuggerTiming = () => {
    if (isDevToolsActive) return;
    try {
      const startTime = performance.now();
      /* eslint-disable no-debugger */
      debugger;
      const endTime = performance.now();

      if (endTime - startTime > 100) {
        triggerSecurityLockout();
      }
    } catch {}
  };

  // 5. Console object getter detection (fires when Console tab is rendered)
  try {
    const probe = new Image();
    Object.defineProperty(probe, 'id', {
      get: function () {
        triggerSecurityLockout();
        return '';
      }
    });
    // Print the probe silently to trigger getter when console is opened
    setInterval(() => {
      if (!isDevToolsActive) {
        // eslint-disable-next-line no-console
        console.log(probe);
      }
    }, 1000);
  } catch {}

  // Run periodic timing trap
  setInterval(checkDebuggerTiming, 600);

  // 6. Window size delta detection for docked DevTools
  const checkWindowDimensions = () => {
    if (isDevToolsActive) return;
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;

    if (widthDiff || heightDiff) {
      checkDebuggerTiming();
    }
  };

  window.addEventListener('resize', checkWindowDimensions, { passive: true });
}
