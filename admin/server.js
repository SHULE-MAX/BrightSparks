// ════════════════════════════════════════════════════════════════════════════
//  Production web server for the Bright Sparks admin dashboard.
//
//  Railway starts this with `npm start`. It does three things:
//    1. serves /config.js, built fresh from the environment variables
//    2. serves the compiled dashboard from dist/
//    3. sends every other URL back to index.html so page refreshes work
// ════════════════════════════════════════════════════════════════════════════

import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, 'dist');
const port = process.env.PORT || 3000;

const app = express();
app.use(compression());

// Fail loudly and early rather than showing a blank dashboard.
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    `\n  Missing environment variable(s): ${missing.join(', ')}\n` +
      `  Set them in Railway under your service → Variables, then redeploy.\n`
  );
}

// ── Runtime configuration handed to the browser ──────────────────────────────
// The anon key is designed to be public — Row Level Security in Supabase is
// what protects the data, not the secrecy of this key. Never put the SERVICE
// ROLE key here; that one bypasses all security.
app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'no-store');
  res.send(
    `window.__BSJS_CONFIG__ = ${JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      siteUrl: process.env.SITE_URL || 'https://brightsparksjunior.ac.ug',
    })};`
  );
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ── Asking GitHub to rebuild the news pages, straight away ───────────────────
//  The public site is static: a story saved here becomes a page only when the
//  Build news pages workflow runs. That workflow is on a timer, so without this
//  a story waits up to a quarter of an hour. The dashboard calls this endpoint
//  the moment anything about an article changes, and the wait becomes a minute.
//
//  WHY THIS LIVES ON THE SERVER AND NOT IN THE DASHBOARD
//  Triggering a workflow needs a GitHub token, and the dashboard is a React app
//  running in somebody's browser: every value it is built with can be read by
//  anyone who opens it. A token put there would be a token given away — one
//  that can push code and start workflows. So the token stays here, in Railway's
//  environment, and the browser only ever gets to ask.
//
//  Set these in Railway → your service → Variables:
//    GITHUB_TOKEN   a fine-grained token for this repository alone, with
//                   Contents: read-only and Actions: read and write. Nothing
//                   else — it never needs to read the database or the code.
//    GITHUB_REPO    SHULE-MAX/BrightSparks
//  Without them the dashboard still saves normally; the story just waits for
//  the timer, and the log below says so.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';

/* Saving an article can easily mean several writes in a row — a save, then a
   visibility toggle, then a correction. Each one asking for its own build would
   queue builds that all produce the same pages, because the workflow refuses to
   run two at once. So a request inside the cooling-off period does not start a
   second build; it arranges one for when the period ends, and any further
   requests fold into that same one. */
const COOLDOWN_MS = 20000;
let lastDispatch = 0;
let trailing = null;

async function tellGitHub() {
  lastDispatch = Date.now();

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: 'publish' }),
    signal: AbortSignal.timeout(15000),
  });

  // 204 is the success here — GitHub returns no body for a dispatch.
  if (res.status !== 204) {
    const detail = await res.text().catch(() => '');
    throw new Error(`GitHub answered ${res.status} ${detail.slice(0, 200)}`);
  }
}

app.post('/api/rebuild', async (req, res) => {
  const absent = [
    !GITHUB_TOKEN && 'GITHUB_TOKEN',
    !GITHUB_REPO && 'GITHUB_REPO',
  ].filter(Boolean);

  if (absent.length) {
    /* Naming the variable turns "it does not work" into something that can be
       acted on. Only the names are ever reported — never a value, and a token
       is a value. */
    console.warn(`  A rebuild was asked for, but ${absent.join(' and ')} is not set on this service.`);
    return res.status(503).json({ ok: false, reason: 'not-configured', missing: absent });
  }

  /* Anyone can reach this address, so being signed in to the dashboard has to
     be proved rather than assumed. Supabase is asked to identify the bearer of
     the token; an answer of anything but a user means no. */
  const header = req.get('authorization') || '';
  const jwt = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!jwt) return res.status(401).json({ ok: false, reason: 'signed-out' });

  try {
    const who = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!who.ok) return res.status(401).json({ ok: false, reason: 'signed-out' });
  } catch {
    return res.status(503).json({ ok: false, reason: 'auth-unreachable' });
  }

  const since = Date.now() - lastDispatch;

  if (since >= COOLDOWN_MS) {
    try {
      await tellGitHub();
      return res.json({ ok: true, when: 'now' });
    } catch (error) {
      console.error(`  Could not ask GitHub to rebuild: ${error.message}`);
      return res.status(502).json({ ok: false, reason: 'github-refused' });
    }
  }

  const wait = COOLDOWN_MS - since;
  if (!trailing) {
    trailing = setTimeout(() => {
      trailing = null;
      tellGitHub().catch((error) => console.error(`  Delayed rebuild failed: ${error.message}`));
    }, wait);
  }
  return res.json({ ok: true, when: 'shortly', inMs: wait });
});

// Hashed asset filenames can be cached hard; index.html never should be.
//
// sw.js is the other file that must never be cached. A browser holding an old
// copy of the service worker would keep serving an old dashboard, and there
// would be no way to correct it from here.
app.use(
  express.static(dist, {
    setHeaders(res, filePath) {
      const name = path.basename(filePath);
      if (name === 'index.html' || name === 'sw.js') res.set('Cache-Control', 'no-store');
      else if (name === 'manifest.webmanifest' || name === 'offline.html') {
        res.set('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// Single-page app fallback: /news, /gallery etc. are React routes, not files.
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Bright Sparks admin dashboard listening on port ${port}`);

  /* Said at startup so the deploy log answers the question on its own, rather
     than someone having to guess why a story is not appearing at once. Railway
     keeps variables per service and per environment, so one added to the wrong
     one is invisible here and looks exactly like one never added. Printing the
     names this process can actually see settles that; values are never shown,
     and a token is a value. */
  if (GITHUB_TOKEN && GITHUB_REPO) {
    console.log(`  Instant publishing is on — builds will be asked of ${GITHUB_REPO}.`);
  } else {
    const seen = Object.keys(process.env).filter((k) => /GITHUB|^GH_/i.test(k));
    console.warn(
      `  Instant publishing is OFF: ${[!GITHUB_TOKEN && 'GITHUB_TOKEN', !GITHUB_REPO && 'GITHUB_REPO']
        .filter(Boolean)
        .join(' and ')} is not set on this service.`
    );
    console.warn(`  GitHub-ish variables this process can see: ${seen.length ? seen.join(', ') : 'none at all'}`);
    console.warn('  Stories still save; they wait for the 15-minute build instead.');
  }
});
