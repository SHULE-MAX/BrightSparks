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

// Hashed asset filenames can be cached hard; index.html never should be.
app.use(
  express.static(dist, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) res.set('Cache-Control', 'no-store');
      else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
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
});
