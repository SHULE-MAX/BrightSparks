import { useId } from 'react';

// ── Form building blocks ─────────────────────────────────────────────────────
// Every field carries a plain-English label and an optional hint, because the
// people using this dashboard are teachers and office staff, not developers.

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink ' +
  'transition placeholder:text-slate-400 focus:border-navy-light focus:ring-2 ' +
  'focus:ring-navy-light/25 focus:outline-none disabled:bg-slate-100';

export function Field({ label, hint, required, error, children }) {
  const id = useId();
  const child =
    typeof children === 'function' ? children(id) : <div id={id}>{children}</div>;

  /* Note for side-by-side fields: when two of these share a grid row and their
     hints are different lengths, put `items-end` on the grid so the inputs
     line up with each other. */
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-ink">
        {label}
        {required && <span className="ml-1 text-brand-red">*</span>}
      </label>
      {hint && <p className="mb-1.5 text-xs leading-snug text-ink-muted">{hint}</p>}
      {child}
      {error && <p className="mt-1.5 text-xs font-semibold text-brand-red">{error}</p>}
    </div>
  );
}

export function TextInput({ label, hint, required, error, ...props }) {
  return (
    <Field label={label} hint={hint} required={required} error={error}>
      {(id) => <input id={id} className={inputClass} {...props} />}
    </Field>
  );
}

export function TextArea({ label, hint, required, error, rows = 3, ...props }) {
  return (
    <Field label={label} hint={hint} required={required} error={error}>
      {(id) => <textarea id={id} rows={rows} className={`${inputClass} resize-y`} {...props} />}
    </Field>
  );
}

export function Select({ label, hint, required, error, options, ...props }) {
  return (
    <Field label={label} hint={hint} required={required} error={error}>
      {(id) => (
        <select id={id} className={inputClass} {...props}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/**
 * A picker that shows each choice in its own website colour, so the editor
 * chooses by recognising how it will look rather than by reading a code.
 */
export function ChoiceGrid({ label, hint, value, onChange, options, columns = 2 }) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-1.5 text-sm font-bold text-ink">{label}</legend>
      {hint && <p className="mb-2 text-xs leading-snug text-ink-muted">{hint}</p>}
      <div className={`grid gap-2 ${columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={selected}
              className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition ${
                selected
                  ? 'border-navy bg-navy/5 text-navy'
                  : 'border-slate-200 bg-white text-ink-muted hover:border-slate-300'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-5 w-5 shrink-0 rounded-md border border-black/10"
                style={{ background: o.color }}
              />
              <span className="flex-1 leading-tight">
                {o.label}
                {o.note && <span className="block text-xs font-normal opacity-70">{o.note}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy"
      />
      <span>
        <span className="block text-sm font-bold text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{hint}</span>}
      </span>
    </label>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────
const variants = {
  primary: 'bg-navy text-white hover:bg-navy-mid disabled:bg-slate-400',
  danger: 'bg-brand-red text-white hover:bg-brand-red-dark disabled:bg-slate-400',
  ghost: 'bg-white text-ink border border-slate-300 hover:bg-slate-50',
  subtle: 'bg-slate-100 text-ink-muted hover:bg-slate-200',
};

export function Button({ variant = 'primary', className = '', busy, children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={busy || props.disabled}
      {...props}
    >
      {busy && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
