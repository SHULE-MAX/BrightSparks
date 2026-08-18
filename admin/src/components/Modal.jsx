import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * The add/edit sheet used by all four content managers.
 * Closes on Escape and on backdrop click, restores focus and page scroll,
 * and keeps its footer buttons visible while long forms scroll.
 */
export default function Modal({ open, title, subtitle, onClose, children, footer, wide = false }) {
  const bodyRef = useRef(null);
  const previouslyFocused = useRef(null);

  /* Every manager passes onClose as an inline arrow, so it is a different
     function on each render. Reading it from a ref keeps the Escape handler
     pointing at the current one WITHOUT making it a dependency of the effect
     below — see the comment there for why that matters. */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  /* Depends on `open` alone, deliberately.
     Including onClose here meant the effect tore down and re-ran on every
     keystroke: the cleanup handed focus back to the button behind the modal
     and the re-run then moved it again, so a field went dead after a single
     character and had to be clicked again for the next one. */
  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKeyDown);

    /* Land on the first field the editor actually fills in. Searching the
       whole panel would find the ✕ close button first, since it sits above
       the form in the header. */
    const first = bodyRef.current?.querySelector(
      'input, select, textarea, [contenteditable]'
    );
    first?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-deep/50 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-auto flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          wide ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        <header className="flex items-start gap-4 border-b border-slate-200 bg-cream px-6 py-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-navy">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 rounded-lg px-2 py-1 text-xl leading-none text-ink-muted transition hover:bg-slate-200 hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div ref={bodyRef} className="max-h-[70vh] flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
