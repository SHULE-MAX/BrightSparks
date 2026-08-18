-- ════════════════════════════════════════════════════════════════════════════
--  BRIGHT SPARKS JUNIOR SCHOOL — ADMIN DASHBOARD SCHEMA
--
--  HOW TO APPLY THIS FILE
--  1. Go to https://supabase.com and open your project.
--  2. In the left sidebar click "SQL Editor", then "New query".
--  3. Copy this ENTIRE file, paste it in, and press "Run".
--  4. Then follow storage-buckets.md in this same folder.
--
--  Running this file a second time is safe — it will not duplicate anything.
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
--  SHARED: automatically stamp updated_at whenever a row changes
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ═══ 1. CALENDAR EVENTS ══════════════════════════════════════════════════════
-- Feeds calendar.html (the month grid, the side panel and the all-events table).
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  date        date        not null,
  end_date    date,                       -- only for multi-day events, e.g. tours
  label       text        not null,
  description text        not null default '',
  type        text        not null default 'event-type'
              check (type in ('key', 'event-type', 'exam', 'holiday')),
  published   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_date_idx      on public.events (date);
create index if not exists events_published_idx on public.events (published);


-- ═══ 2. NEWS ARTICLES ════════════════════════════════════════════════════════
-- Feeds news.html and (for articles with an image) the "Blog" tab of gallery.html.
create table if not exists public.articles (
  id           uuid primary key default gen_random_uuid(),
  date         date        not null default current_date,
  category     text        not null default 'academics'
               check (category in ('academics', 'sports', 'events', 'clubs')),
  color        text        not null default 'navy'
               check (color in ('navy', 'red', 'green', 'gold', 'sky')),
  icon         text        not null default '📚',
  image_url    text,                      -- relative site path OR Supabase Storage URL
  title        text        not null,
  excerpt      text        not null default '',
  body         text        not null default '',   -- HTML from the dashboard editor

  -- Pinned announcements render above the article grid instead of inside it
  pinned       boolean     not null default false,
  pinned_label text,
  border_color text        default 'var(--gold)',

  published    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists articles_date_idx      on public.articles (date desc);
create index if not exists articles_published_idx on public.articles (published);


-- ═══ 3. DOWNLOADABLE RESOURCES ═══════════════════════════════════════════════
-- Feeds the document cards on resources.html.
create table if not exists public.resources (
  id              uuid primary key default gen_random_uuid(),
  title           text        not null,
  description     text        not null default '',
  category        text        not null default 'circular'
                  check (category in ('circular', 'rules', 'newsletter', 'workplan')),
  meta_label      text        not null default '',  -- e.g. "Term II 2026"
  file_url        text        not null,             -- relative path OR Storage URL
  file_size_bytes bigint,
  position        integer     not null default 0,   -- display order, lowest first
  published       boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists resources_position_idx on public.resources (position);


-- ═══ 4. GALLERY PHOTOS ═══════════════════════════════════════════════════════
-- Feeds the photo grid on gallery.html.
create table if not exists public.gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  title      text        not null,
  caption    text        not null default '',
  category   text        not null default 'facilities'
             check (category in ('facilities', 'sports', 'events', 'staff', 'blog')),
  image_url  text        not null,        -- relative path OR Storage URL
  position   integer     not null default 0,
  published  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_position_idx on public.gallery_photos (position);


-- ═══ 5. TIKTOK VIDEOS ════════════════════════════════════════════════════════
-- Feeds the TikTok section of gallery.html.
create table if not exists public.tiktok_videos (
  id         uuid primary key default gen_random_uuid(),
  tiktok_id  text        not null,        -- the long number from the video URL
  title      text        not null default '',
  position   integer     not null default 0,
  published  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ═══ 6. ANALYTICS PAGE VIEWS ═════════════════════════════════════════════════
-- Written by analytics.js on the public site, read by the dashboard.
-- Deliberately stores NO personal data and NO cookies — session_id is a random
-- value that lives only in the tab's sessionStorage and disappears on close.
create table if not exists public.page_views (
  id         bigserial primary key,
  path       text        not null,
  referrer   text        not null default '',
  session_id text        not null default '',
  device     text        not null default 'desktop'
             check (device in ('mobile', 'tablet', 'desktop')),
  browser    text        not null default '',
  screen_w   integer,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);
create index if not exists page_views_path_idx       on public.page_views (path);
create index if not exists page_views_session_idx    on public.page_views (session_id);


-- ─────────────────────────────────────────────────────────────────────────────
--  TRIGGERS — keep updated_at accurate on every content table
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['events','articles','resources','gallery_photos','tiktok_videos']
  loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$I
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--
--  This is the real security boundary. The website carries the "anon" key in
--  plain sight (that is normal and expected for Supabase), so these policies —
--  not the key — are what stop a stranger editing the school's content.
--
--    • anyone           → may READ published content
--    • anyone           → may WRITE a page view (so analytics works)
--    • anyone           → may NOT read page views (visitor data stays private)
--    • signed-in admins → may do everything
-- ════════════════════════════════════════════════════════════════════════════

alter table public.events        enable row level security;
alter table public.articles      enable row level security;
alter table public.resources     enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.tiktok_videos enable row level security;
alter table public.page_views    enable row level security;

-- Public read of published rows + full control for signed-in admins,
-- applied identically to all five content tables.
do $$
declare t text;
begin
  foreach t in array array['events','articles','resources','gallery_photos','tiktok_videos']
  loop
    execute format('drop policy if exists "public reads published" on public.%1$I', t);
    execute format(
      'create policy "public reads published" on public.%1$I
       for select to anon using (published = true)', t);

    execute format('drop policy if exists "admins do everything" on public.%1$I', t);
    execute format(
      'create policy "admins do everything" on public.%1$I
       for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Analytics: the public may only ever INSERT, never SELECT.
drop policy if exists "anyone records a view" on public.page_views;
create policy "anyone records a view" on public.page_views
  for insert to anon with check (true);

drop policy if exists "admins read views" on public.page_views;
create policy "admins read views" on public.page_views
  for select to authenticated using (true);


-- ─────────────────────────────────────────────────────────────────────────────
--  TABLE-LEVEL GRANTS
--
--  Policies decide WHICH ROWS a role may touch, but a role must also hold the
--  underlying table privilege at all. Supabase normally grants these
--  automatically; setting them explicitly means this file works on its own and
--  avoids the confusing "permission denied for table" error.
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

grant select on
  public.events, public.articles, public.resources,
  public.gallery_photos, public.tiktok_videos
  to anon, authenticated;

grant insert, update, delete on
  public.events, public.articles, public.resources,
  public.gallery_photos, public.tiktok_videos
  to authenticated;

grant insert on public.page_views to anon, authenticated;
grant select on public.page_views to authenticated;
grant usage, select on sequence public.page_views_id_seq to anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
--  ANALYTICS ROLL-UPS
--
--  Counting rows in the browser would mean downloading every page view. These
--  functions do the counting inside the database and return only the totals,
--  so the dashboard stays fast no matter how much traffic the site gets.
--  They run with the caller's own permissions, so the RLS policy above still
--  applies — a signed-out visitor gets nothing back.
-- ════════════════════════════════════════════════════════════════════════════

-- Daily view + unique-visitor counts, with zero-filled gaps so the chart line
-- never jumps across days that had no traffic.
create or replace function public.analytics_daily(days integer default 30)
returns table (day date, views bigint, visitors bigint)
language sql
security invoker
stable
as $$
  select
    d::date                                  as day,
    count(pv.id)                             as views,
    count(distinct pv.session_id)            as visitors
  from generate_series(
         (current_date - (days - 1))::date,
         current_date,
         interval '1 day'
       ) as d
  left join public.page_views pv
    on pv.created_at >= d
   and pv.created_at <  d + interval '1 day'
  group by d
  order by d;
$$;

-- Totals for the KPI tiles: this period and the one immediately before it,
-- so the dashboard can show a percentage change.
create or replace function public.analytics_totals(days integer default 30)
returns table (views bigint, visitors bigint, prev_views bigint, prev_visitors bigint)
language sql
security invoker
stable
as $$
  select
    count(*) filter (where created_at >= now() - make_interval(days => days)),
    count(distinct session_id) filter (where created_at >= now() - make_interval(days => days)),
    count(*) filter (where created_at >= now() - make_interval(days => days * 2)
                       and created_at <  now() - make_interval(days => days)),
    count(distinct session_id) filter (where created_at >= now() - make_interval(days => days * 2)
                                         and created_at <  now() - make_interval(days => days))
  from public.page_views;
$$;

-- Most visited pages in the period.
create or replace function public.analytics_top_pages(days integer default 30, limit_n integer default 12)
returns table (path text, views bigint, visitors bigint)
language sql
security invoker
stable
as $$
  select path, count(*) as views, count(distinct session_id) as visitors
  from public.page_views
  where created_at >= now() - make_interval(days => days)
  group by path
  order by views desc
  limit limit_n;
$$;

-- Where visitors came from, already bucketed into plain-English sources.
create or replace function public.analytics_sources(days integer default 30)
returns table (source text, views bigint)
language sql
security invoker
stable
as $$
  select
    case
      when referrer = '' or referrer is null                              then 'Direct'
      when referrer ~* '(google|bing|yahoo|duckduckgo|ecosia)\.'          then 'Search'
      when referrer ~* '(facebook|instagram|tiktok|twitter|x\.com|linkedin|youtube|whatsapp|t\.me)' then 'Social'
      when referrer ~* 'brightsparksjunior\.ac\.ug'                       then 'Internal'
      else 'Other websites'
    end as source,
    count(*) as views
  from public.page_views
  where created_at >= now() - make_interval(days => days)
  group by 1
  order by 2 desc;
$$;

-- Phone vs tablet vs computer.
create or replace function public.analytics_devices(days integer default 30)
returns table (device text, views bigint)
language sql
security invoker
stable
as $$
  select device, count(*) as views
  from public.page_views
  where created_at >= now() - make_interval(days => days)
  group by device
  order by views desc;
$$;

-- Only signed-in staff may run the analytics functions. They are declared
-- SECURITY INVOKER, so the page_views policy applies inside them too — a
-- signed-out caller would get nothing back even if they could call them.
revoke execute on function
  public.analytics_daily(integer), public.analytics_totals(integer),
  public.analytics_top_pages(integer, integer), public.analytics_sources(integer),
  public.analytics_devices(integer)
  from public, anon;

grant execute on function
  public.analytics_daily(integer), public.analytics_totals(integer),
  public.analytics_top_pages(integer, integer), public.analytics_sources(integer),
  public.analytics_devices(integer)
  to authenticated;
