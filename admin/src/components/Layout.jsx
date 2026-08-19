import { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { SITE_URL } from '../lib/supabase.js';
import { InstallButton, PwaNotices } from './Pwa.jsx';

const NAV = [
  { to: '/', label: 'Visitors', icon: '📊', end: true, blurb: 'How the website is doing' },
  { to: '/calendar', label: 'Calendar', icon: '📅', blurb: 'Term dates and events' },
  { to: '/news', label: 'News', icon: '📰', blurb: 'Articles and announcements' },
  { to: '/resources', label: 'Resources', icon: '📄', blurb: 'PDFs parents download' },
  { to: '/gallery', label: 'Gallery', icon: '🖼️', blurb: 'Photos and TikTok videos' },
];

/** Wraps the pages that require someone to be signed in. */
export function RequireAuth({ children }) {
  const { session, checking } = useAuth();
  if (checking) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }
  return session ? children : <Navigate to="/login" replace />;
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 px-3 pt-3">
        {/* On the white panel for the same reason as the login screen: the
            logo's navy lettering would disappear straight into the sidebar. */}
        <img
          src="/logo.webp"
          alt="Bright Sparks Junior School"
          width="1257"
          height="666"
          className="mb-2.5 h-auto w-full rounded-lg bg-white/95 px-2.5 py-2"
        />
        <p className="text-sm leading-tight font-extrabold text-white">Website Manager</p>
      </div>

      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-start gap-3 rounded-xl px-3 py-2.5 transition ${
              isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {item.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">{item.label}</span>
            <span className="block text-xs leading-snug opacity-70">{item.blurb}</span>
          </span>
        </NavLink>
      ))}

      <div className="mt-auto border-t border-white/15 pt-3">
        <InstallButton />
        <a
          href={SITE_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden="true">🌐</span> View the website
        </a>
        <div className="px-3 pt-3 pb-1">
          <p className="truncate text-xs text-white/50">Signed in as</p>
          <p className="truncate text-xs font-bold text-white/85">{user?.email}</p>
          <button
            onClick={signOut}
            className="mt-2 w-full rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );

  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  return (
    <div className="flex min-h-full">
      {/* Permanent sidebar on large screens */}
      <aside className="hidden w-64 shrink-0 bg-navy lg:block">{sidebar}</aside>

      {/* Slide-over sidebar on phones and tablets */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-deep/60"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative h-full w-72 max-w-[85vw] bg-navy shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-lg leading-none"
          >
            ☰
          </button>
          <span className="font-bold text-navy">{current?.label ?? 'Website Manager'}</span>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <PwaNotices />
    </div>
  );
}

/** Standard page heading used by every screen. */
export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
