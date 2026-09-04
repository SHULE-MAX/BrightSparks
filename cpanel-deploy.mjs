#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
 *  BRIGHT SPARKS — PUT THE NEWS FILES ON THE SERVER, OVER HTTPS
 *
 *  WHY THIS EXISTS RATHER THAN AN FTP DEPLOY
 *  The workflow used to upload over FTPS and never once succeeded. The log
 *  shows why: login, TLS and every directory command work, the server answers
 *      > EPSV
 *      < 229 Extended Passive mode OK (|||55656|)
 *  and then nothing ever answers on port 55656. FTP moves file contents over a
 *  second connection to a high port the server picks, and this host does not
 *  allow those from outside. Only the host can open them, GitHub's runners have
 *  no fixed address to allowlist, and a raised timeout only buys a slower
 *  failure — that was tried, and it bought exactly five minutes of one.
 *
 *  cPanel's own API has no second connection. Everything below is one ordinary
 *  HTTPS request to port 2083, the same port the control panel is used on, so
 *  there is nothing for a firewall to have closed.
 *
 *  HOW IT DECIDES WHAT TO DO
 *  It keeps a record on the server — .bsjs-news-deploy.json, a list of every
 *  file it has uploaded and the hash of what it uploaded. Each run compares
 *  that against _deploy/ and touches only the difference: new and changed files
 *  go up, files that have gone from _deploy/ are deleted, and everything else
 *  is left alone. The WordPress blog under /wp, the photographs and every page
 *  this deploy did not write are not in the record, so they are invisible to it
 *  and cannot be overwritten or removed.
 *
 *  A story withdrawn in the dashboard loses its page here. That is the point,
 *  and it is also why an incomplete _deploy/ would be destructive — hence the
 *  guards below, which would rather stop than delete the site.
 *
 *  HOW TO RUN IT
 *      node build-news.mjs                    write the pages
 *      node package-upload.mjs --stage _deploy   lay them out
 *      node cpanel-deploy.mjs --dry-run       say what would change
 *      node cpanel-deploy.mjs                 do it
 *
 *  CREDENTIALS
 *  From the environment — CPANEL_HOST, CPANEL_USER, CPANEL_API_TOKEN — which is
 *  how the workflow supplies them, or from .cpanel-token at the project root
 *  for running it by hand. That file is gitignored and holds a live credential
 *  with the run of the whole account; if it ever leaks, revoke the token in
 *  cPanel → Security → Manage API Tokens and issue another. Nothing here
 *  changes when you do.
 * ════════════════════════════════════════════════════════════════════════════ */

import { readFile, readdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STAGE_DIR = path.join(ROOT, '_deploy');
const STATE_NAME = '.bsjs-news-deploy.json';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

/* A bad build must never be allowed to empty the site. If a run wants to delete
   more than this share of what it has previously uploaded, it stops and says so
   instead — a real edition of the news never removes most of itself at once. */
const MASS_DELETE_SHARE = 0.5;

/* Files go up in batches. Small enough that no single request is large or slow,
   large enough that a normal run is a handful of requests rather than dozens. */
const BATCH_FILES = 15;
const BATCH_BYTES = 6 * 1024 * 1024;

// ── Credentials ────────────────────────────────────────────────────────────
const cfg = { ...process.env };
const TOKEN_FILE = path.join(ROOT, '.cpanel-token');
if (existsSync(TOKEN_FILE)) {
  for (const line of readFileSync(TOKEN_FILE, 'utf8').split(/\r?\n/)) {
    if (line.trimStart().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) cfg[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const HOST = cfg.CPANEL_HOST;
/* An FTP account is named user@domain and the cPanel account it belongs to is
   the bare name. The two are easy to confuse — the first attempt at this used
   the FTP form and was rejected — so take the bare name either way. */
const USER = (cfg.CPANEL_USER || '').split('@')[0];
const TOKEN = cfg.CPANEL_API_TOKEN;
/* Where the site is served from. Every path this script touches is under here
   and is built from it, so nothing above it is reachable even by mistake. */
const REMOTE_ROOT = (cfg.CPANEL_DIR || 'public_html').replace(/\/+$/, '');

if (!HOST || !USER || !TOKEN) {
  console.error('\n  Missing CPANEL_HOST, CPANEL_USER or CPANEL_API_TOKEN.');
  console.error('  Set them in the environment, or in .cpanel-token at the project root.\n');
  process.exit(1);
}

const BASE = `https://${HOST}:2083`;
const AUTH = { Authorization: `cpanel ${USER}:${TOKEN}` };

/* The token must never reach a log — least of all a public Actions log. */
const scrub = (s) => String(s).split(TOKEN).join('«token»');

/* Nor should the account name, which is half of what is needed to log in.
   GitHub masks a secret only where it appears verbatim, and the bare name
   taken out of user@domain no longer matches the secret it came from — so it
   would print in the clear unless it is masked here. Enough is left to tell
   at a glance whether the right account was used. */
const masked = USER.length <= 4 ? '****' : `${USER.slice(0, 2)}${'*'.repeat(USER.length - 4)}${USER.slice(-2)}`;
const say = (m) => console.log(`  ${m}`);
const chat = (m) => { if (VERBOSE) console.log(`      · ${m}`); };

// ── Talking to cPanel ──────────────────────────────────────────────────────
/* One request, with a few retries. A refused credential is final and fails at
   once; a timeout or a 5xx is worth trying again, because the thing this whole
   script exists to avoid is a transient network hiccup being mistaken for a
   real failure — and the reverse. */
async function request(url, init, label) {
  let last;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(90000) });
      const text = await res.text();

      if (res.status === 403 || res.status === 401) {
        throw Object.assign(new Error(
          `cPanel refused the credentials (HTTP ${res.status}) on ${label}. The token may have ` +
          'been revoked or mistyped; check CPANEL_USER is the cPanel account name, not user@domain.'
        ), { fatal: true });
      }

      let json = null;
      try { json = JSON.parse(text); } catch { /* below */ }

      if (!json) {
        /* cPanel answers a request it will not authenticate with its login
           page, so HTML here means the request never reached the API. The
           token is not usually the reason — it was accepted a moment earlier —
           and the likeliest cause is the host briefly refusing a caller that
           has logged in many times in quick succession. Worth waiting out
           rather than asking again straight away. */
        throw Object.assign(
          new Error(`${label}: cPanel returned its login page (${text.length} bytes) instead of an answer`),
          { refused: true }
        );
      }

      chat(`${label} → HTTP ${res.status}`);
      return json;
    } catch (error) {
      if (error.fatal) throw error;
      last = error;
      if (attempt < 3) {
        /* A refused login needs long enough for the host to stop refusing;
           three seconds only spends an attempt confirming it still is. */
        const wait = error.refused ? attempt * 20000 : attempt * 3000;
        chat(`${label} failed (${scrub(error.message)}) — retrying in ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  throw new Error(`${label} failed after 3 attempts: ${scrub(last?.message ?? 'unknown')}`);
}

async function uapi(module, func, params = {}, body = null) {
  const url = new URL(`${BASE}/execute/${module}/${func}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const json = await request(url, { method: body ? 'POST' : 'GET', headers: AUTH, body }, `${module}::${func}`);
  return json;
}

/* Deleting is the one thing UAPI on this host cannot do — there is no
   Fileman::trash_files here — so it goes through the older API 2, which does. */
async function api2(module, func, params = {}) {
  const url = new URL(`${BASE}/json-api/cpanel`);
  url.searchParams.set('cpanel_jsonapi_user', USER);
  url.searchParams.set('cpanel_jsonapi_apiversion', '2');
  url.searchParams.set('cpanel_jsonapi_module', module);
  url.searchParams.set('cpanel_jsonapi_func', func);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const json = await request(url, { headers: AUTH }, `API2 ${module}::${func}`);
  return json;
}

// ── What is here, and what is up there ─────────────────────────────────────
async function readLocal() {
  const files = new Map();

  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }

      const rel = path.relative(STAGE_DIR, full).split(path.sep).join('/');
      if (rel === STATE_NAME) continue;             // the record is not cargo

      const body = await readFile(full);
      files.set(rel, { body, hash: createHash('sha256').update(body).digest('hex') });
    }
  };

  await walk(STAGE_DIR);
  return files;
}

/* "There is no record on the server" and "I could not find out whether there is
   a record on the server" are entirely different answers, and treating the
   second as the first is how a run comes to believe the site is empty. That
   happened: cPanel handed back its login page instead of an answer, this read
   swallowed it, and the run went on to announce a first publish and try to
   re-upload all 24 files. Nothing was lost — an empty record deletes nothing —
   but it would have rewritten the whole site over a moment's refused request,
   and a genuine record of what is up there is the one thing the deploy cannot
   do its job without. So only a plain "that file is not there" means no record;
   anything else stops the run. */
async function readState() {
  let res;
  try {
    res = await uapi('Fileman', 'get_file_content', { dir: REMOTE_ROOT, file: STATE_NAME });
  } catch (error) {
    throw new Error(
      `Could not read ${STATE_NAME} from the server, so there is no way to tell what is already ` +
      `there. Stopping rather than assuming the site is empty. ${scrub(error.message)}`
    );
  }

  if (res.status === 1) {
    try {
      const parsed = JSON.parse(res.data?.content ?? res.data ?? '{}');
      return new Map(Object.entries(parsed.files ?? {}));
    } catch {
      /* A record that cannot be read is worth no more than none, and unlike a
         refused request this cannot fix itself — so start again from scratch,
         which re-uploads everything once and writes a good record. */
      console.warn(`  ${STATE_NAME} on the server is not readable JSON. Treating this as a first publish.`);
      return null;
    }
  }

  const why = scrub(JSON.stringify(res.errors ?? ''));
  if (/not exist|no such file|cannot be found|failed to open/i.test(why)) return null;

  throw new Error(`Could not read ${STATE_NAME}: ${why}`);
}

// ── Doing it ───────────────────────────────────────────────────────────────
async function uploadBatch(dir, entries) {
  const form = new FormData();
  form.set('dir', dir);
  /* Without this cPanel will not replace a file that is already there, and
     says only "Failed to upload any of the requested files with various
     failures" — the same message whatever went wrong, and it fails the whole
     batch rather than the one file. Replacing is the ordinary case here:
     news.html, the sitemap and the feed are rewritten on every run. */
  form.set('overwrite', '1');
  entries.forEach(([rel, file], i) => {
    form.set(`file-${i + 1}`, new Blob([file.body]), path.posix.basename(rel));
  });

  const res = await uapi('Fileman', 'upload_files', {}, form);
  if (res.status !== 1) {
    throw new Error(`upload into ${dir} failed: ${scrub(JSON.stringify(res.errors))}`);
  }

  /* cPanel reports each file it accepted. A short list means some were
     silently dropped, and a deploy that shrugged at that would leave the site
     half-published while claiming success. */
  const accepted = res.data?.uploads?.length ?? 0;
  if (accepted !== entries.length) {
    throw new Error(`uploaded ${entries.length} file(s) into ${dir} but cPanel acknowledged ${accepted}`);
  }
}

async function remove(remotePath) {
  const res = await api2('Fileman', 'fileop', { op: 'unlink', sourcefiles: remotePath, doubledecode: 0 });
  const row = res.cpanelresult?.data?.[0];
  if (row?.result != 1) {
    throw new Error(`could not delete ${remotePath}: ${scrub(row?.reason ?? JSON.stringify(res.cpanelresult?.error))}`);
  }
}

async function main() {
  if (!existsSync(STAGE_DIR)) {
    console.error('\n  No _deploy/ folder. Run "node package-upload.mjs --stage _deploy" first.\n');
    process.exit(1);
  }

  console.log(`\n  ${DRY_RUN ? 'Dry run — nothing will be changed' : 'Deploying'} to ${HOST} as ${masked}`);
  console.log(`  Target: ${REMOTE_ROOT}/\n`);

  const local = await readLocal();
  if (local.size === 0) {
    console.error('  _deploy/ is empty. Refusing to run — this would delete every page.\n');
    process.exit(1);
  }

  const state = await readState();
  const first = state === null;
  say(first
    ? `First publish — no record on the server yet. ${local.size} files to upload.`
    : `${local.size} files here, ${state.size} recorded on the server.`);

  // ── Work out the difference ──────────────────────────────────────────────
  const changed = [...local.entries()].filter(([rel, f]) => !state || state.get(rel) !== f.hash);
  const removed = state ? [...state.keys()].filter((rel) => !local.has(rel)) : [];

  if (!changed.length && !removed.length) {
    console.log('\n  Nothing has changed. The server is already up to date.\n');
    return;
  }

  console.log('');
  for (const [rel] of changed) say(`↑ ${state?.has(rel) ? 'update' : 'new'}  ${rel}`);
  for (const rel of removed) say(`✗ delete  ${rel}`);

  if (removed.length && removed.length > Math.max(3, state.size * MASS_DELETE_SHARE)) {
    console.error(`\n  Stopping: this run wants to delete ${removed.length} of ${state.size} files.`);
    console.error('  That is not what a normal edition looks like — it is what a broken build');
    console.error('  looks like. Check _deploy/ is complete, then run again.\n');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(`\n  Dry run: ${changed.length} to upload, ${removed.length} to delete. Nothing was changed.\n`);
    return;
  }

  // ── Upload, a directory at a time ────────────────────────────────────────
  const byDir = new Map();
  for (const entry of changed) {
    const dir = path.posix.dirname(entry[0]);
    const remote = dir === '.' ? REMOTE_ROOT : `${REMOTE_ROOT}/${dir}`;
    if (!byDir.has(remote)) byDir.set(remote, []);
    byDir.get(remote).push(entry);
  }

  console.log('');
  let done = 0;
  for (const [dir, entries] of byDir) {
    /* upload_files makes a missing directory itself, so a new story's folder
       needs no separate call. */
    for (let i = 0; i < entries.length;) {
      const batch = [];
      let bytes = 0;
      while (i < entries.length && batch.length < BATCH_FILES && bytes < BATCH_BYTES) {
        bytes += entries[i][1].body.length;
        batch.push(entries[i++]);
      }
      await uploadBatch(dir, batch);
      done += batch.length;
      say(`uploaded ${done}/${changed.length} — ${dir}/`);
    }
  }

  // ── Delete what has gone ─────────────────────────────────────────────────
  for (const rel of removed) {
    await remove(`${REMOTE_ROOT}/${rel}`);
    say(`deleted ${rel}`);
  }

  /* A withdrawn story leaves news/<slug>/ standing empty once its index.html
     has gone. Only folders this deploy is responsible for are cleared away —
     a folder is removed only when every file recorded in it has gone and
     nothing local is left there. */
  const emptied = new Set();
  for (const rel of removed) {
    const dir = path.posix.dirname(rel);
    if (dir === '.' || !dir.startsWith('news/')) continue;
    const stillUsed = [...local.keys()].some((r) => path.posix.dirname(r) === dir);
    if (!stillUsed) emptied.add(dir);
  }
  for (const dir of emptied) {
    try {
      await remove(`${REMOTE_ROOT}/${dir}`);
      say(`removed the empty folder ${dir}/`);
    } catch (error) {
      /* Not worth failing the run over — the page is already gone, which is
         what mattered. */
      say(`note: ${dir}/ is empty but could not be removed (${scrub(error.message)})`);
    }
  }

  // ── Write the record back ────────────────────────────────────────────────
  const record = {
    updated: new Date().toISOString(),
    note: 'Written by cpanel-deploy.mjs. Deleting this file makes the next run re-upload everything, which is harmless.',
    files: Object.fromEntries([...local.entries()].map(([rel, f]) => [rel, f.hash]))
  };

  const form = new FormData();
  form.set('dir', REMOTE_ROOT);
  form.set('overwrite', '1');            // it is replaced on every run
  form.set('file-1', new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }), STATE_NAME);
  const saved = await uapi('Fileman', 'upload_files', {}, form);
  if (saved.status !== 1) {
    throw new Error(`the files are up, but the record could not be saved: ${scrub(JSON.stringify(saved.errors))}`);
  }

  /* The record lists every file on the site and answers no useful question for
     a reader. .htaccess denies it, but .htaccess is not deployed from here, so
     it is worth checking rather than assuming. */
  try {
    const res = await fetch(`https://${HOST}/${STATE_NAME}`, { signal: AbortSignal.timeout(20000) });
    if (res.ok) {
      console.log(`\n  ::warning::${STATE_NAME} is readable at https://${HOST}/${STATE_NAME}.`);
      console.log('  Add the <Files ".bsjs-news-deploy.json"> Require all denied block from this');
      console.log("  repository's .htaccess to the one on the server.");
    }
  } catch { /* not being able to check is not a reason to fail the deploy */ }

  console.log(`\n  Done — ${changed.length} uploaded, ${removed.length} deleted. The pages are live.\n`);
}

main().catch((error) => {
  console.error(`\n  Deploy failed: ${scrub(error.message)}\n`);
  process.exit(1);
});
