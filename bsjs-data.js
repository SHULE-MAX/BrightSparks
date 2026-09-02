/* ════════════════════════════════════════════════════════════════════════════
 *  BRIGHT SPARKS — WEBSITE CONTENT LOADER
 *
 *  Calendar events, news, resources and gallery photos are no longer typed
 *  into these HTML files. They are stored in the school's database and edited
 *  through the Website Manager dashboard, and this file fetches them.
 *
 *  ─────────────────────────────────────────────────────────────────────────
 *  IF YOU ARE SETTING THIS UP: fill in the two settings just below. Get them
 *  from supabase.com → your project → Settings → API. The "anon public" key is
 *  meant to be visible in a website like this; it can only read content that
 *  has been published, and cannot change anything.
 *  ─────────────────────────────────────────────────────────────────────────
 *
 *  If the database is ever unreachable, every page falls back to the content
 *  it was last able to load, and then to the built-in copy in each page — so
 *  the website never shows an empty calendar or news section.
 * ════════════════════════════════════════════════════════════════════════════ */

window.BSJS = (function () {
  'use strict';

  var SUPABASE_URL = 'https://cbfywxwatrtcfhamksfl.supabase.co';
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZnl3eHdhdHJ0Y2ZoYW1rc2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDcxMjEsImV4cCI6MjEwMjYyMzEyMX0.AEbwpXE14jAdcNJjrjevbsX5nlBdXhjYGXciIsGI1Nc';

  var configured =
    SUPABASE_URL.indexOf('YOUR-PROJECT') === -1 && SUPABASE_ANON_KEY.indexOf('YOUR-ANON') === -1;

  // ── Helpers ───────────────────────────────────────────────────────────────

  /* Content typed into the dashboard is plain text, but these pages build
     their markup with innerHTML. Escaping here means an apostrophe or an
     ampersand in a headline can never break — or alter — the page. Article
     bodies are deliberately excluded: those are written as formatted text in
     the dashboard's editor and are meant to keep their formatting. */
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Images and PDFs are stored one of two ways: rows carried over from the old
     hand-written pages hold a path relative to this site, while anything
     uploaded through the dashboard holds a full web address. Both work. */
  function assetUrl(value) {
    return value || '';
  }

  function cacheKey(table) {
    return 'bsjs_cache_' + table;
  }

  function readCache(table) {
    try {
      var raw = sessionStorage.getItem(cacheKey(table));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeCache(table, rows) {
    try {
      sessionStorage.setItem(cacheKey(table), JSON.stringify(rows));
    } catch (e) {
      /* A full or disabled storage is not worth breaking the page over. */
    }
  }

  /**
   * Fetches one table of published rows.
   * Always goes to the network first so edits appear immediately; the cache is
   * a safety net for a dropped connection, not a speed trick.
   */
  function fetchTable(table, order) {
    if (!configured) return Promise.reject(new Error('Content database not configured yet'));

    var url =
      SUPABASE_URL +
      '/rest/v1/' +
      table +
      '?select=*&published=eq.true&order=' +
      encodeURIComponent(order);

    return fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
    })
      .then(function (response) {
        if (!response.ok) throw new Error(table + ' returned ' + response.status);
        return response.json();
      })
      .then(function (rows) {
        writeCache(table, rows);
        return rows;
      })
      .catch(function (error) {
        var cached = readCache(table);
        if (cached) {
          console.warn('[BSJS] Using the last saved copy of ' + table + ':', error.message);
          return cached;
        }
        throw error;
      });
  }

  // ── Public API — one function per kind of content ──────────────────────────

  /** Calendar events, shaped exactly as calendar.html already expects them. */
  function fetchEvents() {
    return fetchTable('events', 'date.asc').then(function (rows) {
      return rows.map(function (r) {
        return {
          date: r.date,
          endDate: r.end_date || undefined,
          label: esc(r.label),
          desc: esc(r.description),
          type: r.type,
        };
      });
    });
  }

  /** News articles, shaped exactly as news.html and gallery.html expect. */
  function fetchArticles() {
    return fetchTable('articles', 'date.desc').then(function (rows) {
      return rows.map(function (r) {
        if (r.pinned) {
          return {
            pinned: true,
            pinnedLabel: esc(r.pinned_label || ''),
            borderColor: r.border_color || 'var(--gold)',
            title: esc(r.title),
            body: r.body,
          };
        }
        return {
          date: r.date,
          dateLabel: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          category: r.category,
          color: r.color,
          icon: r.icon,
          image: assetUrl(r.image_url),
          title: esc(r.title),
          excerpt: esc(r.excerpt),
          body: r.body,

          /* Carried through for the news page's byline and timestamps, and to
             match the structured data build-news.mjs writes for each article.
             `author` is optional — until the articles table has that column
             the news page falls back to crediting the school itself. */
          updatedAt: r.updated_at || r.created_at || null,
          author: r.author ? esc(r.author) : null,
        };
      });
    });
  }

  /** Downloadable documents for resources.html. */
  function fetchResources() {
    return fetchTable('resources', 'position.asc').then(function (rows) {
      return rows.map(function (r) {
        return {
          title: esc(r.title),
          description: esc(r.description),
          category: r.category,
          metaLabel: esc(r.meta_label),
          fileUrl: assetUrl(r.file_url),
          sizeLabel: formatSize(r.file_size_bytes),
        };
      });
    });
  }

  /** Gallery photos for gallery.html. */
  function fetchGallery() {
    return fetchTable('gallery_photos', 'position.asc').then(function (rows) {
      return rows.map(function (r) {
        return {
          title: esc(r.title),
          caption: esc(r.caption),
          category: r.category,
          image: assetUrl(r.image_url),
        };
      });
    });
  }

  /** TikTok videos for gallery.html. */
  function fetchTiktok() {
    return fetchTable('tiktok_videos', 'position.asc').then(function (rows) {
      return rows.map(function (r) {
        return { id: r.tiktok_id, title: esc(r.title) };
      });
    });
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  return {
    configured: configured,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    esc: esc,
    fetchEvents: fetchEvents,
    fetchArticles: fetchArticles,
    fetchResources: fetchResources,
    fetchGallery: fetchGallery,
    fetchTiktok: fetchTiktok,
  };
})();
