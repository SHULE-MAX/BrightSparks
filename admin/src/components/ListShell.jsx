// Small presentational pieces shared by all four content managers, so the
// lists feel identical wherever the editor is working.

export function LoadingList({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/70" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p aria-hidden="true" className="text-4xl">
        {icon}
      </p>
      <h2 className="mt-3 text-lg font-bold text-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Shows at a glance whether something is on the public website. */
export function VisibilityToggle({ published, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={published}
      title={published ? 'Showing on the website — click to hide' : 'Hidden — click to show'}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ${
        published
          ? 'bg-brand-green-light/15 text-brand-green hover:bg-brand-green-light/25'
          : 'bg-slate-200 text-ink-muted hover:bg-slate-300'
      }`}
    >
      <span aria-hidden="true">{published ? '●' : '○'}</span>
      {published ? 'Showing' : 'Hidden'}
    </button>
  );
}

export function RowActions({ onEdit, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onMoveUp && (
        <>
          <IconButton label="Move up" disabled={!canMoveUp} onClick={onMoveUp}>
            ↑
          </IconButton>
          <IconButton label="Move down" disabled={!canMoveDown} onClick={onMoveDown}>
            ↓
          </IconButton>
        </>
      )}
      <button
        onClick={onEdit}
        className="rounded-lg px-3 py-1.5 text-xs font-bold text-navy transition hover:bg-navy/10"
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        className="rounded-lg px-3 py-1.5 text-xs font-bold text-brand-red transition hover:bg-brand-red/10"
      >
        Delete
      </button>
    </div>
  );
}

function IconButton({ label, children, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className="rounded-lg px-2 py-1.5 text-sm leading-none text-ink-muted transition hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  );
}
