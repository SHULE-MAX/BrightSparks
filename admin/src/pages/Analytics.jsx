import { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../lib/supabase.js';
import { number, percentChange } from '../lib/format.js';
import { PageHeader } from '../components/Layout.jsx';
import { useToast } from '../components/Toast.jsx';

// ── Chart colours ────────────────────────────────────────────────────────────
// The school's navy and gold are used for the dashboard's own chrome, but they
// fail the data-visualisation checks as a *series* pair on a white chart
// surface (navy sits below the lightness band; gold falls under 3:1 contrast).
// These two are the validated categorical slots 1 and 2 — worst-case colour-
// blind separation ΔE 24.7, normal-vision ΔE 33.6, both well clear of the
// floors. Re-run scripts/validate_palette.js before changing them.
const SERIES_VIEWS = '#2a78d6';
const SERIES_VISITORS = '#eb6834';
const GRID = '#e1e0d9';
const AXIS = '#c3c2b7';
const MUTED = '#898781';

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
];

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const [daily, totals, pages, sources, devices] = await Promise.all([
      supabase.rpc('analytics_daily', { days }),
      supabase.rpc('analytics_totals', { days }),
      supabase.rpc('analytics_top_pages', { days, limit_n: 10 }),
      supabase.rpc('analytics_sources', { days }),
      supabase.rpc('analytics_devices', { days }),
    ]);

    const failed = [daily, totals, pages, sources, devices].find((r) => r.error);
    if (failed) {
      toast.error('Could not load visitor figures. Please refresh the page.');
      setLoading(false);
      return;
    }

    setData({
      daily: daily.data || [],
      totals: totals.data?.[0] || { views: 0, visitors: 0, prev_views: 0, prev_visitors: 0 },
      pages: pages.data || [],
      sources: sources.data || [],
      devices: devices.data || [],
    });
    setLoading(false);
  }, [days, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const t = data?.totals;
  const busiest = data?.daily?.length
    ? data.daily.reduce((best, d) => (Number(d.views) > Number(best.views) ? d : best))
    : null;

  const chartData = (data?.daily || []).map((d) => ({
    day: d.day,
    label: new Date(`${d.day}T00:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    }),
    views: Number(d.views),
    visitors: Number(d.visitors),
  }));

  const hasAnyData = Boolean(t && (Number(t.views) > 0 || Number(t.prev_views) > 0));

  return (
    <>
      <PageHeader
        title="Visitors"
        description="How many people are using the school website, which pages they read, and where they came from. Figures update as people browse the site."
      />

      {/* Time range — one row above the charts, as a single control group. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            aria-pressed={days === r.days}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              days === r.days
                ? 'bg-navy text-white'
                : 'border border-slate-300 bg-white text-ink-muted hover:bg-slate-50'
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-ink-muted transition hover:bg-slate-50"
        >
          ↻ Refresh
        </button>
      </div>

      {loading && <Skeleton />}

      {!loading && !hasAnyData && <NoDataYet />}

      {!loading && hasAnyData && (
        <div className="space-y-6">
          {/* ── Stat tiles ──────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              hero
              label="Page views"
              value={Number(t.views)}
              delta={percentChange(Number(t.views), Number(t.prev_views))}
              periodName={`previous ${days} days`}
            />
            <StatTile
              label="Visitors"
              value={Number(t.visitors)}
              delta={percentChange(Number(t.visitors), Number(t.prev_visitors))}
              periodName={`previous ${days} days`}
              note="Counted once per person per visit"
            />
            <StatTile
              label="Average views a day"
              value={Math.round(Number(t.views) / days)}
            />
            <StatTile
              label="Busiest day"
              value={busiest ? Number(busiest.views) : 0}
              note={
                busiest
                  ? new Date(`${busiest.day}T00:00:00`).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : '—'
              }
            />
          </div>

          {/* ── Trend ───────────────────────────────────────────────────── */}
          <Card
            title="Visits over time"
            subtitle="Page views counts every page opened. Visitors counts each person once per visit."
          >
            {/* Two series, so a legend is always present. */}
            <div className="mb-3 flex flex-wrap gap-4">
              <LegendKey color={SERIES_VIEWS} label="Page views" />
              <LegendKey color={SERIES_VISITORS} label="Visitors" />
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: MUTED, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: AXIS }}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: MUTED, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={52}
                  />
                  <Tooltip
                    content={<TrendTooltip />}
                    cursor={{ stroke: AXIS, strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="Page views"
                    stroke={SERIES_VIEWS}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    // Drawn immediately rather than animated in: this is a
                    // figures screen staff glance at, and the sweep delays the
                    // one thing they came to read.
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    name="Visitors"
                    stroke={SERIES_VISITORS}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    // Drawn immediately rather than animated in: this is a
                    // figures screen staff glance at, and the sweep delays the
                    // one thing they came to read.
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Breakdowns ──────────────────────────────────────────────── */}
          <Card
            title="Most visited pages"
            subtitle="The pages parents and visitors opened most often."
          >
            <BarList
              rows={data.pages.map((p) => ({
                key: p.path,
                label: prettyPath(p.path),
                sub: p.path,
                value: Number(p.views),
              }))}
              unit="views"
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Where visitors came from"
              subtitle="Direct means they typed the address or used a bookmark."
            >
              <BarList
                rows={data.sources.map((s) => ({
                  key: s.source,
                  label: s.source,
                  value: Number(s.views),
                }))}
                unit="views"
              />
            </Card>

            <Card title="What they used" subtitle="Phone, tablet or computer.">
              <BarList
                rows={data.devices.map((d) => ({
                  key: d.device,
                  label: DEVICE_LABELS[d.device] || d.device,
                  value: Number(d.views),
                }))}
                unit="views"
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

const DEVICE_LABELS = { mobile: 'Phone', tablet: 'Tablet', desktop: 'Computer' };

// ── Pieces ───────────────────────────────────────────────────────────────────

function Card({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-navy">{title}</h2>
      {subtitle && <p className="mt-0.5 mb-4 text-xs text-ink-muted">{subtitle}</p>}
      {children}
    </section>
  );
}

function LegendKey({ color, label }) {
  return (
    <span className="flex items-center gap-2 text-xs font-bold text-ink-muted">
      <span
        aria-hidden="true"
        className="h-0.5 w-5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

/**
 * `hero` marks the one number the page leads with — deliberately only used once.
 * The delta is direction-coloured and always names the period it compares to,
 * with an arrow so the direction never relies on colour alone.
 */
function StatTile({ label, value, delta, periodName, note, hero }) {
  const up = delta != null && delta > 0;
  const flat = delta === 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold tracking-wide text-ink-muted uppercase">{label}</p>
      <p className={`mt-1 font-extrabold text-ink ${hero ? 'text-5xl' : 'text-3xl'}`}>
        {number(value)}
      </p>

      {delta != null && (
        <p
          className={`mt-1.5 text-xs font-bold ${
            flat ? 'text-ink-muted' : up ? 'text-[#006300]' : 'text-brand-red'
          }`}
        >
          <span aria-hidden="true">{flat ? '→' : up ? '↑' : '↓'}</span>{' '}
          {flat ? 'No change' : `${Math.abs(delta)}%`}{' '}
          <span className="font-medium text-ink-muted">vs {periodName}</span>
        </p>
      )}

      {note && <p className="mt-1.5 text-xs text-ink-muted">{note}</p>}
    </div>
  );
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-bold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-xs text-ink-muted">
          <span
            aria-hidden="true"
            className="h-0.5 w-4 rounded-full"
            style={{ background: p.stroke }}
          />
          <span className="flex-1">{p.name}</span>
          <strong className="font-bold text-ink tabular-nums">{number(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

/**
 * A labelled bar list — this is simultaneously the chart and the table view,
 * so the figures are always readable as text and never colour-only.
 */
function BarList({ rows, unit }) {
  if (!rows.length) {
    return <p className="py-4 text-sm text-ink-muted">Nothing recorded in this period yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.value)) || 1;
  const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;

  return (
    <ol className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={r.sub || r.label}>
              {r.label}
            </span>
            <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
              {number(r.value)}
            </span>
            <span className="w-12 shrink-0 text-right text-xs text-ink-muted tabular-nums">
              {Math.round((r.value / total) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((r.value / max) * 100, 2)}%`, background: SERIES_VIEWS }}
              role="img"
              aria-label={`${number(r.value)} ${unit}`}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/70" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/70" />
    </div>
  );
}

function NoDataYet() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <p aria-hidden="true" className="text-4xl">
        📊
      </p>
      <h2 className="mt-3 text-lg font-bold text-navy">No visits recorded yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        Figures appear here once the updated website is live and people start browsing it. If the
        site has already been updated, visit a few pages yourself and then press Refresh.
      </p>
    </div>
  );
}

/** "/news.html" → "News" — page addresses shown the way staff talk about them. */
function prettyPath(path) {
  const names = {
    '/': 'Home',
    '/index.html': 'Home',
    '/news.html': 'News',
    '/calendar.html': 'School Calendar',
    '/gallery.html': 'Gallery',
    '/resources.html': 'Resources',
    '/admissions.html': 'Admissions',
    '/fees.html': 'Fees',
    '/careers.html': 'Careers',
    '/cookies-policy.html': 'Cookies Policy',
  };
  if (names[path]) return names[path];
  return path
    .replace(/^\//, '')
    .replace(/\.html$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Home';
}
