import { createClient } from '@supabase/supabase-js';

// Settings are injected by /config.js (see server.js and vite.config.js).
const config = window.__BSJS_CONFIG__ || {};

export const SITE_URL = (config.siteUrl || 'https://brightsparksjunior.ac.ug').replace(/\/$/, '');

/** True when the server has been given its Supabase settings. */
export const isConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

export const supabase = createClient(
  config.supabaseUrl || 'https://placeholder.supabase.co',
  config.supabaseAnonKey || 'placeholder',
  { auth: { persistSession: true, autoRefreshToken: true } }
);

// ── Storage buckets ──────────────────────────────────────────────────────────
export const BUCKETS = {
  news: 'news-images',
  gallery: 'gallery',
  resources: 'resources',
};

/**
 * Uploads a file and returns its permanent public URL.
 * Names are made unique so re-uploading a photo called "sports.jpg" never
 * silently overwrites an older one that another article still points at.
 */
export async function uploadFile(bucket, file) {
  const safeName = file.name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const ext = (file.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  const key = `${Date.now()}-${safeName || 'file'}${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(key, file, { cacheControl: '31536000', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

/**
 * Resolves a stored path for display.
 *
 * Rows seeded from the old hardcoded website hold a relative path such as
 * "images/assets/ictlab.webp", which only resolves against the live site.
 * Anything uploaded through this dashboard holds a full Supabase URL already.
 */
export function publicUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (/^(https?:)?\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}/${pathOrUrl.replace(/^\//, '')}`;
}

/** Removes an uploaded file, ignoring anything that lives on the main site. */
export async function deleteUploadedFile(bucket, url) {
  if (!url || !/^https?:\/\//i.test(url)) return;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  if (at === -1) return;
  const key = decodeURIComponent(url.slice(at + marker.length));
  await supabase.storage.from(bucket).remove([key]);
}
