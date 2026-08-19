// ════════════════════════════════════════════════════════════════════════════
//  The installable-app side of the dashboard.
//
//  Three jobs, all reported through one small store so any component can read
//  them with usePwa():
//    · can the browser install this app, and can we trigger that
//    · has a new version been deployed and is it waiting to take over
//    · is the device currently offline
//
//  The store lives outside React because the browser fires
//  "beforeinstallprompt" once, early, often before React has mounted. Missing
//  it means the Install button never appears.
// ════════════════════════════════════════════════════════════════════════════

import { useSyncExternalStore } from 'react';

const listeners = new Set();
let state = {
  canInstall: false,
  updateReady: false,
  offline: typeof navigator !== 'undefined' && navigator.onLine === false,
};

function set(patch) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reactive access to the three flags above. */
export function usePwa() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** iPhones and iPads have no install prompt — they need told where to tap. */
export const isIos =
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** True when the dashboard is already running as an installed app. */
export function isInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true
  );
}

let installPrompt = null;
let waiting = null;
let updating = false;

/**
 * Show the browser's install dialog. Returns true if the app was installed.
 */
export async function promptInstall() {
  if (!installPrompt) return false;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  // The event can only be used once, whichever way it was answered.
  installPrompt = null;
  set({ canInstall: false });
  return outcome === 'accepted';
}

/**
 * Hand over to the new service worker and reload onto the new version. The
 * page reloads from the "controllerchange" handler below, once the swap has
 * actually happened.
 */
export function applyUpdate() {
  if (!waiting) return;
  updating = true;
  waiting.postMessage('skip-waiting');
}

/**
 * A newly downloaded worker reaches "installed" and then sits waiting. The
 * controller check distinguishes an update from the very first install, which
 * needs no announcement.
 */
function watchWorker(worker) {
  const check = () => {
    if (worker.state !== 'installed' || !navigator.serviceWorker.controller) return;
    worker.removeEventListener('statechange', check);
    waiting = worker;
    set({ updateReady: true });
  };
  worker.addEventListener('statechange', check);
  check();
}

/** Called once from main.jsx, before React renders. */
export function startPwa() {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => set({ offline: false }));
  window.addEventListener('offline', () => set({ offline: true }));

  window.addEventListener('beforeinstallprompt', (event) => {
    // Without this the browser shows its own mini-infobar instead, and we lose
    // the ability to offer the prompt from the sidebar.
    event.preventDefault();
    installPrompt = event;
    set({ canInstall: true });
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    set({ canInstall: false });
  });

  if (!('serviceWorker' in navigator)) return;

  // In development the worker would serve yesterday's modules back to Vite's
  // hot reloading, which is baffling to debug. Registering only in the built
  // app also means `npm run dev` is never haunted by a worker left behind by
  // an earlier `npm run preview`.
  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Also fires the first time a worker takes control, which must not reload
    // the page out from under someone — only an update we asked for does.
    if (!updating) return;
    updating = false;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      if (registration.waiting && navigator.serviceWorker.controller) {
        waiting = registration.waiting;
        set({ updateReady: true });
      }

      registration.addEventListener('updatefound', () => {
        if (registration.installing) watchWorker(registration.installing);
      });

      // Staff leave this open all day. Check for a new deploy whenever they
      // come back to the tab rather than only when they next reload.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    } catch (err) {
      // An uninstallable app is a worse day than a non-offline one; never let
      // this break the dashboard.
      console.warn('[PWA] Service worker registration failed', err);
    }
  });
}
