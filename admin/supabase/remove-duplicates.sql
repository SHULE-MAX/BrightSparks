-- ════════════════════════════════════════════════════════════════════════════
--  BRIGHT SPARKS — REMOVE DUPLICATE CONTENT
--
--  WHAT THIS IS FOR
--  seed.sql is a one-time import. If it is run more than once, every event,
--  article, document and photo is inserted again, and the website shows each
--  of them two or three times over.
--
--  This file removes the extra copies and keeps the original of each — the
--  first one that was created. Anything you have written yourself since is
--  untouched, because it has no duplicate to match against.
--
--  HOW TO APPLY
--  SQL Editor → New query → paste this whole file → Run.
--  The last query prints what you are left with, so you can check it worked.
--
--  Running this a second time is safe: with no duplicates left, it deletes
--  nothing.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- Each block groups rows by what makes them the "same" item to a reader, keeps
-- the oldest, and deletes the rest.

-- Calendar events: the same name on the same day is the same event.
delete from public.events e
using (
  select id, row_number() over (
    partition by date, label
    order by created_at, id
  ) as copy_number
  from public.events
) dup
where e.id = dup.id and dup.copy_number > 1;

-- News: the same headline on the same date is the same article.
delete from public.articles a
using (
  select id, row_number() over (
    partition by title, date
    order by created_at, id
  ) as copy_number
  from public.articles
) dup
where a.id = dup.id and dup.copy_number > 1;

-- Documents: the same title pointing at the same file.
delete from public.resources r
using (
  select id, row_number() over (
    partition by title, file_url
    order by created_at, id
  ) as copy_number
  from public.resources
) dup
where r.id = dup.id and dup.copy_number > 1;

-- Gallery: the same photo file with the same title.
delete from public.gallery_photos g
using (
  select id, row_number() over (
    partition by title, image_url
    order by created_at, id
  ) as copy_number
  from public.gallery_photos
) dup
where g.id = dup.id and dup.copy_number > 1;

-- TikTok: the video id is the identity.
delete from public.tiktok_videos t
using (
  select id, row_number() over (
    partition by tiktok_id
    order by created_at, id
  ) as copy_number
  from public.tiktok_videos
) dup
where t.id = dup.id and dup.copy_number > 1;


-- Duplicated rows leave gaps and repeats in the display order. Renumber the
-- two ordered lists so the up/down arrows in the dashboard behave predictably.
update public.resources r
set position = ordered.new_position
from (
  select id, row_number() over (order by position, created_at) as new_position
  from public.resources
) ordered
where r.id = ordered.id and r.position is distinct from ordered.new_position;

update public.gallery_photos g
set position = ordered.new_position
from (
  select id, row_number() over (order by position, created_at) as new_position
  from public.gallery_photos
) ordered
where g.id = ordered.id and g.position is distinct from ordered.new_position;

update public.tiktok_videos t
set position = ordered.new_position
from (
  select id, row_number() over (order by position, created_at) as new_position
  from public.tiktok_videos
) ordered
where t.id = ordered.id and t.position is distinct from ordered.new_position;


-- Clears out any test visits recorded while the site was being set up, so the
-- Visitors screen starts from real traffic only.
delete from public.page_views
where path in ('/setup-test', '/test') or session_id = 'verify';

commit;


-- ── What you should be left with ────────────────────────────────────────────
-- If seed.sql was the only thing that added content, these are the numbers
-- from the original website: 12 events, 9 articles, 4 documents, 11 photos,
-- 2 videos. Higher numbers are fine — that is your own work.
select 'events' as content, count(*) as remaining from public.events
union all select 'articles',       count(*) from public.articles
union all select 'resources',      count(*) from public.resources
union all select 'gallery photos', count(*) from public.gallery_photos
union all select 'tiktok videos',  count(*) from public.tiktok_videos
order by 1;
