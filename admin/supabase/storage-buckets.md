# Storage buckets

Photos and PDFs uploaded through the dashboard are kept in Supabase Storage.
Three buckets are needed. Create them **after** running `schema.sql`.

## 1. Create the buckets

In Supabase, open **Storage** in the left sidebar, then press **New bucket**
three times and create:

| Bucket name   | Public | Holds                                    |
|---------------|--------|------------------------------------------|
| `news-images` | ✅ yes | Cover photos on news articles            |
| `gallery`     | ✅ yes | Photos in the website gallery            |
| `resources`   | ✅ yes | PDFs parents download                    |

**Public must be ticked on all three.** These files are meant to be visible to
anyone browsing the school website — that is the whole point of them. "Public"
here only means the files can be *read*; uploading and deleting still requires
being signed in, which the policies below enforce.

## 2. Allow signed-in staff to upload

Public buckets are readable by everyone but writable by nobody until you say
otherwise. Open **SQL Editor → New query**, paste this, and press **Run**:

```sql
-- Anyone may read the files (they appear on the public website).
drop policy if exists "public reads school files" on storage.objects;
create policy "public reads school files" on storage.objects
  for select to anon
  using (bucket_id in ('news-images', 'gallery', 'resources'));

-- Only signed-in staff may add, replace or remove them.
drop policy if exists "staff upload school files" on storage.objects;
create policy "staff upload school files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('news-images', 'gallery', 'resources'));

drop policy if exists "staff update school files" on storage.objects;
create policy "staff update school files" on storage.objects
  for update to authenticated
  using (bucket_id in ('news-images', 'gallery', 'resources'));

drop policy if exists "staff delete school files" on storage.objects;
create policy "staff delete school files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('news-images', 'gallery', 'resources'));
```

## 3. Optional but recommended: size and type limits

For each bucket, open it, press the **⋯** menu → **Edit bucket**, and set:

- **File size limit:** `10 MB` (the dashboard refuses anything larger anyway,
  but setting it here enforces it on the server too)
- **Allowed MIME types:**
  - `news-images` and `gallery` → `image/jpeg, image/png, image/webp, image/gif`
  - `resources` → `application/pdf`

## A note on existing files

Photos and PDFs that were already on the school website before the dashboard
existed — everything under `images/`, `Resources/` and so on — are **not**
copied into these buckets and do not need to be. Those rows store a path
relative to the school's own web server, and the website loads them from there
exactly as it always has. Only new uploads go to Supabase.
