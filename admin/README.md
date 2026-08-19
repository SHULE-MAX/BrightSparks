# Bright Sparks — Website Manager

An admin dashboard that lets school staff update the website's **calendar,
news, resources and gallery**, and see **how many people are visiting**, without
editing any code.

- **Dashboard** — React + Vite + Tailwind, runs on Railway
- **Database, logins and file storage** — Supabase
- **Public website** — the existing static HTML on cPanel/Apache, unchanged in
  structure; it now reads its content from the database instead of from
  hardcoded arrays

---

## Setting it up (one time)

You need a free [Supabase](https://supabase.com) account and a
[Railway](https://railway.app) account. Budget about 30 minutes.

### 1. Create the database

1. Create a new Supabase project. Save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste all of
   [`supabase/schema.sql`](supabase/schema.sql), and press **Run**.
3. Do the same with [`supabase/seed.sql`](supabase/seed.sql). This copies the
   content currently hardcoded in the website into the database, so the
   dashboard opens with everything already in it.
   **Run seed.sql once only** — running it twice creates duplicates.
4. Follow [`supabase/storage-buckets.md`](supabase/storage-buckets.md) to create
   the three file buckets.

### 2. Create the staff login

Supabase → **Authentication → Users → Add user → Create new user**. Enter the
email address and a password, and tick **Auto Confirm User**.

There is deliberately no public sign-up: accounts can only be created here, by
someone with access to the Supabase project.

> Repeat for each staff member who needs access. Everyone who can sign in has
> the same, full editing rights.

### 3. Collect the two settings

Supabase → **Settings → API**:

| Setting | Where to find it |
|---|---|
| `SUPABASE_URL` | "Project URL", e.g. `https://abcdefgh.supabase.co` |
| `SUPABASE_ANON_KEY` | the key labelled **anon / public** |

⚠️ There is a second key called **service_role**. It bypasses every security
rule. Never put it in the dashboard, the website, or this repository.

The anon key is *designed* to be public — it is what the website itself uses.
What protects the data is the Row Level Security policies in `schema.sql`:
signed-out visitors can read published content and nothing else.

### 4. Deploy the dashboard to Railway

1. Railway → **New Project → Deploy from GitHub repo** → pick this repository.
2. Open the service's **Settings** and set **Root Directory** to `admin`.
   This is essential — the repository root is the school website, not this app.
3. Under **Variables**, add:
   ```
   SUPABASE_URL       = https://your-project.supabase.co
   SUPABASE_ANON_KEY  = your-anon-public-key
   SITE_URL           = https://brightsparksjunior.ac.ug
   ```
4. Under **Settings → Networking**, press **Generate Domain**.
5. Open that address and sign in with the account from step 2.

The build and start commands come from [`railway.json`](railway.json); Railway
does not need any further configuration.

### 5. Connect the public website

Open [`../bsjs-data.js`](../bsjs-data.js) and replace the two placeholders at
the top with the same values from step 3:

```js
var SUPABASE_URL      = 'https://your-project.supabase.co';
var SUPABASE_ANON_KEY = 'your-anon-public-key';
```

Then upload these files to the web host the way the site is normally deployed:

```
bsjs-data.js      (new)
analytics.js      (new)
news-data.js      (changed)
calendar.html     (changed)
news.html         (changed)
gallery.html      (changed)
resources.html    (changed)
cookies-policy.html, index.html, admissions.html,
fees.html, careers.html, demo.html   (changed — visit counting added)
```

**This is the only time the website files need uploading.** From then on, every
content change is made in the dashboard and appears on the site immediately.

---

## Installing it as an app

The dashboard is a **progressive web app**: it can be installed on a phone,
tablet or computer and then opens in its own window, with its own icon, no
address bar, and no need to remember the Railway address.

| Where | How |
|---|---|
| Android (Chrome) | Sign in, then press **Install app** at the bottom of the menu |
| Windows / Mac (Chrome or Edge) | The same **Install app** button, or the install icon in the address bar |
| iPhone / iPad (Safari) | **Share → Add to Home Screen** — the button in the menu shows this reminder |

Long-pressing the installed icon on Android offers shortcuts straight into
**Calendar**, **News** and **Gallery**.

**What works without a connection:** the app itself opens, so staff on a weak
signal get the dashboard rather than a browser error page. The content does
*not*, because every list in here is live data from Supabase that a colleague
may have changed a minute ago — a stale copy would be worse than an honest
message. A notice appears while the connection is down, and nothing is saved
until it returns.

**When a new version is deployed**, the app notices, and offers **Reload**
rather than swapping itself out mid-edit. Nobody has to clear a cache.

The pieces involved: [`public/manifest.webmanifest`](public/manifest.webmanifest)
(name, icons, colours), [`public/sw.js`](public/sw.js) (the service worker that
stores the app's own files), [`public/offline.html`](public/offline.html) (the
last-resort page) and [`src/lib/pwa.js`](src/lib/pwa.js) (install prompt,
update prompt, offline flag). The icons in `public/icons/` were generated from
the school logo in `../favicon_io.zip`.

> The service worker is only registered in the built app, never by
> `npm run dev`, so it can never serve stale modules while you are working.

---

## Running it on your own computer

```bash
cd admin
cp .env.example .env     # then fill in the two Supabase values
npm install
npm run dev              # http://localhost:5173
```

`npm run preview` builds it and serves it exactly as Railway does.

---

## How it fits together

```
┌────────────────────┐        ┌──────────────────┐        ┌────────────────────┐
│  Website Manager   │ write  │    Supabase      │  read  │  Public website    │
│  React on Railway  │───────▶│  Postgres + RLS  │◀───────│  static HTML on    │
│                    │        │  Auth + Storage  │        │  Apache / cPanel   │
└────────────────────┘        └──────────────────┘        └─────────┬──────────┘
        ▲  reads visit figures        ▲ records a visit             │
        └─────────────────────────────┴─────────────────────────────┘
                                  analytics.js
```

### Where each page gets its content

| Website page | Table | Loaded by |
|---|---|---|
| `calendar.html` | `events` | `BSJS.fetchEvents()` |
| `news.html` | `articles` **+ the WordPress blog** | `BSJS.fetchArticles()` merged with the WP REST API |
| `resources.html` | `resources` | `BSJS.fetchResources()` |
| `gallery.html` | `gallery_photos`, `tiktok_videos`, `articles` | `BSJS.fetchGallery()` and friends |

News deliberately keeps the existing WordPress feed. Articles written in the
dashboard and posts published in WordPress both appear, sorted together by date.

### The website can never go blank

Each page keeps a built-in copy of its content and draws that first, then swaps
in the live version once it arrives. If the database is unreachable the page
falls back to the last copy it successfully loaded, and then to the built-in
one. This is tested — see below.

Because of that, **the fallback lists slowly go stale.** They are a safety net,
not a second place to edit. It is worth refreshing them from the database once a
year or so.

### Visit counting

`analytics.js` records one row per page view. It sets no cookies and stores no
personal data, so it needs no consent prompt. It ignores localhost, obvious
bots, and browsers sending "Do Not Track". Failures are swallowed silently —
counting visits must never be able to break a page for a parent.

The dashboard reads it through five database functions (`analytics_daily`,
`analytics_totals`, `analytics_top_pages`, `analytics_sources`,
`analytics_devices`) which do the counting inside Postgres, so the dashboard
stays fast no matter how much traffic the site gets.

---

## Checking it still works

The website's fallback behaviour and its live rendering are both covered by
throwaway jsdom harnesses used during development. To re-check by hand:

1. **Live path** — add an event in the dashboard, then reload `calendar.html`.
   It should appear without any redeploy.
2. **Fallback path** — in the browser's dev tools, block `*.supabase.co` and
   reload each of the four pages. Every one should still render content, and the
   console should show a single `[Calendar] Showing the built-in event list`
   style warning rather than an error.
3. **Security** — sign out, open the browser console on the public site and try
   `fetch(BSJS.SUPABASE_URL + '/rest/v1/events', {method:'POST', ...})`. Row
   Level Security should refuse it. A `GET` on `page_views` should also be
   refused.
4. **Analytics** — browse a few pages, then check the Visitors screen.

---

## Project layout

```
admin/
├── railway.json           deployment settings
├── server.js              production server; serves dist/ and /config.js
├── vite.config.js         build + the dev-mode equivalent of /config.js
├── supabase/
│   ├── schema.sql         tables, security policies, analytics functions
│   ├── seed.sql           one-time import of the old hardcoded content
│   └── storage-buckets.md file storage setup
├── public/                logos, app icons, manifest, service worker
└── src/
    ├── lib/               Supabase client, auth, the shared useCollection hook
    ├── components/        modal, form fields, toasts, file upload, rich text
    └── pages/             Analytics + the four content managers
```

The Supabase settings reach the browser at **runtime** via `/config.js` rather
than being compiled into the JavaScript. Changing a key on Railway therefore
only needs a restart, not a rebuild.
