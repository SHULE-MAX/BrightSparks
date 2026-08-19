import { useState } from 'react';
import { applyUpdate, isInstalled, isIos, promptInstall, usePwa } from '../lib/pwa.js';
import { useToast } from './Toast.jsx';

/**
 * "Install app" in the sidebar. Hidden once the app is installed, and on
 * browsers that offer no way to install it at all.
 */
export function InstallButton() {
  const { canInstall } = usePwa();
  const toast = useToast();
  const [iosHelp, setIosHelp] = useState(false);
  const installed = isInstalled();

  if (installed) return null;
  // Safari on iOS never fires the install event; the only route is the Share
  // menu, so all we can do there is say so.
  if (!canInstall && !isIos) return null;

  async function onClick() {
    if (isIos && !canInstall) {
      setIosHelp((open) => !open);
      return;
    }
    if (await promptInstall()) toast.success('Installed. You can open it from your home screen.');
  }

  return (
    <div className="px-3 pb-2">
      <button
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20"
      >
        <span aria-hidden="true">⬇️</span> Install app
      </button>
      {iosHelp && (
        <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-xs leading-relaxed text-white/80">
          Tap <strong>Share</strong> at the bottom of Safari, then{' '}
          <strong>Add to Home Screen</strong>.
        </p>
      )}
    </div>
  );
}

/**
 * Two standing notices: one for a lost connection, one for a new version
 * waiting to be loaded. Bottom-left on a wide screen and along the top on a
 * phone, either way clear of the toasts in the bottom-right corner.
 */
export function PwaNotices() {
  const { offline, updateReady } = usePwa();
  if (!offline && !updateReady) return null;

  return (
    <div className="fixed top-3 right-3 left-3 z-[90] flex flex-col gap-2 sm:top-auto sm:right-auto sm:bottom-5 sm:left-5 sm:w-[22rem]">
      {offline && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border-l-4 border-gold bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg"
        >
          <span aria-hidden="true">📡</span>
          <span>
            No connection. You can keep reading this page, but nothing will save until you are back
            online.
          </span>
        </div>
      )}

      {updateReady && (
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-navy-deep bg-navy px-4 py-3 text-sm font-semibold text-white shadow-lg">
          <span className="flex-1">A new version of the Website Manager is ready.</span>
          <button
            onClick={applyUpdate}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-navy transition hover:bg-white/85"
          >
            Reload
          </button>
        </div>
      )}
    </div>
  );
}
