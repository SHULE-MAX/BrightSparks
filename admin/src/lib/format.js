// Small shared formatting helpers, kept in one place so the whole dashboard
// speaks about dates, sizes and numbers in exactly the same way.

/** "2026-07-11" → "11 July 2026" */
export function longDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "2026-07-11" → "11 Jul 2026" */
export function shortDate(iso) {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Today as YYYY-MM-DD in the school's own timezone, for date-input defaults. */
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 213960 → "209 KB" */
export function fileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 12480 → "12,480" */
export function number(n) {
  return Number(n || 0).toLocaleString('en-GB');
}

/** Percentage change between two periods, or null when there's no baseline. */
export function percentChange(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Strips HTML down to readable text, for list previews and excerpt hints. */
export function plainText(html, limit = 0) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return limit && text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}
