#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
 *  BRIGHT SPARKS — NEWS PAGE BUILDER
 *
 *  WHAT THIS IS FOR
 *  Search engines — and Google News in particular — will not index an article
 *  that only exists as a pop-up on news.html. Each story needs its own address,
 *  and the words of the story have to be in the HTML the moment the page is
 *  served, not fetched afterwards by JavaScript.
 *
 *  This script reads the articles that staff have published (from the Website
 *  Manager dashboard, plus the WordPress blog) and writes out:
 *
 *    news/<slug>/index.html   a real page per article — full text, byline,
 *                             timestamps and NewsArticle structured data
 *    news-sitemap.xml         the Google News sitemap (last 48 hours)
 *    feed.xml                 RSS feed, announced to the WebSub hub
 *    sitemap.xml             every page on the site, articles included
 *    news.html                the article grid, written straight into the page
 *
 *  HOW TO RUN IT
 *      node build-news.mjs             build everything
 *      node build-news.mjs --check     report what would change, write nothing
 *      node build-news.mjs --ping      build, then tell the WebSub hub
 *      node build-news.mjs --ping-only tell the hub, build nothing
 *
 *  Updating the site by hand? Build, upload, and only then announce it:
 *      node build-news.mjs  →  node package-upload.mjs  →  upload and extract
 *                           →  node build-news.mjs --ping-only
 *
 *  It also runs by itself every 30 minutes — see
 *  .github/workflows/news-build.yml — so a story published in the dashboard
 *  turns into a real page without anyone touching the code.
 *
 *  Nothing here is written by hand. If the dashboard cannot be reached the
 *  script stops and changes nothing, leaving the last good pages in place.
 * ════════════════════════════════════════════════════════════════════════════ */

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const NEWS_DIR = path.join(ROOT, 'news');

/* ── Settings ──────────────────────────────────────────────────────────────
   The address the school's site is published at. Everything Google is told
   about — canonical links, sitemaps, the feed — is built from this. */
const SITE_URL = (process.env.SITE_URL || 'https://brightsparksjunior.ac.ug').replace(/\/+$/, '');

const SCHOOL = {
  name: 'Bright Sparks Junior School',
  shortName: 'Bright Sparks',
  motto: 'We Shall Reach the Shore!',
  logo: SITE_URL + '/logo.png',
  telephone: '+256 700 116 093',
  email: 'brightsparksjuniorsch@gmail.com',
  street: 'Seguku-Katale, off Entebbe Road',
  locality: 'Kampala',
  country: 'UG'
};

/* Every article carries a byline. Stories written in the dashboard are the
   school's own, so the school is the author; stories from the blog keep the
   name WordPress recorded. Add an `author` column to the articles table and
   individual staff names will be used automatically.
   `url` is the full address, which is what structured data needs; `href` is how
   an article page two folders deep links to the same place. */
const DEFAULT_AUTHOR = {
  type: 'Organization',
  name: SCHOOL.name,
  role: 'School Communications Office',
  url: SITE_URL + '/index.html#about',
  href: '../../index.html#about'
};

const WP_API = 'https://brightsparksjunior.ac.ug/wp/wp-json/wp/v2';
const WEBSUB_HUB = 'https://pubsubhubbub.appspot.com/';

/* Uganda keeps one clock all year, so timestamps are written in East Africa
   Time. An article's date has no clock time attached to it, and school notices
   go out in the morning — 09:00 is both true enough and stable, and a stable
   value matters: a timestamp that changed on every build would look to Google
   like the story keeps being rewritten. */
const TZ = '+03:00';
const PUBLISH_TIME = 'T09:00:00';

/* The hand-written pages, listed in the order they matter. Articles are added
   to the sitemap underneath these.

   `lastmod` is a claim about when a page last changed, so it is not set to
   today's date on every run — that would tell Google the whole site is rewritten
   nightly and teach it to ignore the field. The two pages marked `follows_news`
   really do change whenever a story is published, and take their date from the
   newest article; the rest keep the date they were last edited by hand. */
const STATIC_PAGES = [
  { loc: '/',                    changefreq: 'weekly',  priority: '1.0', follows_news: true },
  { loc: '/admissions.html',     changefreq: 'monthly', priority: '0.9', lastmod: '2026-05-26' },
  { loc: '/news.html',           changefreq: 'daily',   priority: '0.9', follows_news: true },
  { loc: '/fees.html',           changefreq: 'monthly', priority: '0.8', lastmod: '2026-05-26' },
  { loc: '/gallery.html',        changefreq: 'monthly', priority: '0.7', lastmod: '2026-05-26' },
  { loc: '/calendar.html',       changefreq: 'monthly', priority: '0.7', lastmod: '2026-05-26' },
  { loc: '/resources.html',      changefreq: 'monthly', priority: '0.6', lastmod: '2026-05-26' },
  { loc: '/careers.html',        changefreq: 'monthly', priority: '0.5', lastmod: '2026-05-26' },
  { loc: '/cookies-policy.html', changefreq: 'yearly',  priority: '0.3', lastmod: '2026-05-26' }
];

const CATEGORY_LABEL = { academics: 'Academics', sports: 'Sports', events: 'Events', clubs: 'Clubs' };
const CATEGORY_CLASS = { academics: 'cat-academics', sports: 'cat-sports', events: 'cat-events', clubs: 'cat-clubs' };
const COLOR_CLASS = { navy: 'navy-bg', red: 'red-bg', green: 'green-bg', gold: 'gold-bg', sky: 'sky-bg' };

/* Marks a file as machine-written, so a later run knows it may replace or
   delete it and will never touch a page somebody added by hand. */
const GENERATED_MARK = '<!-- Written by build-news.mjs — do not edit by hand. -->';

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const SHOULD_PING = args.includes('--ping');

/* Announcing the feed is a separate step when the site is updated by hand: the
   hub comes and reads feed.xml the moment it is told, so it has to be told
   AFTER the new file is on the server, not while it is still on this machine.
   Build, upload, then run this. */
const PING_ONLY = args.includes('--ping-only');

// ════════════════════════════════════════════════════════════════════════════
//  SMALL HELPERS
// ════════════════════════════════════════════════════════════════════════════

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* Text arriving from the dashboard has already been through the same escaping
   in bsjs-data.js, and WordPress hands back entities of its own. Both have to
   be turned back into ordinary characters before they can be escaped again for
   a new context (an attribute, XML, JSON) — otherwise "&amp;" slowly grows
   into "&amp;amp;" one build at a time. */
function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&#8217;|&rsquo;/g, '\u2019').replace(/&#8216;|&lsquo;/g, '\u2018')
    .replace(/&#8220;|&ldquo;/g, '\u201C').replace(/&#8221;|&rdquo;/g, '\u201D')
    .replace(/&#8211;|&ndash;/g, '\u2013').replace(/&#8212;|&mdash;/g, '\u2014')
    .replace(/&#8230;|&hellip;/g, '\u2026').replace(/&nbsp;/g, ' ')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

const stripTags = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* JSON-LD sits inside a <script> tag, where the browser's HTML parser is still
   watching for "</script>". Escaping the angle brackets keeps a stray one in an
   article body from ending the block early. */
const jsonLd = (obj) => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

function truncate(text, max = 155) {
  const clean = stripTags(decodeEntities(text));
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\u2013\u2014-]+$/, '') + '…';
}

/* Kept deliberately identical to slugify() in news.html: the two have to agree
   on an article's address or the page's own links would miss their pages. */
function slugify(s) {
  return String(s).toLowerCase()
    .replace(/&amp;/g, 'and').replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '').trim();
}

const dateLabel = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Africa/Kampala' });

const timeLabel = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'Africa/Kampala'
  }) + ' EAT';

/* Relative paths ("images/news/Sports.webp") are how the hand-written pages
   refer to files; uploads from the dashboard are already full addresses.
   Google needs the full address in structured data and share cards. */
function absoluteUrl(src) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  return SITE_URL + '/' + String(src).replace(/^\/+/, '');
}

/* ...and inside /news/<slug>/ the same relative path has to climb back out. */
function pageRelative(src) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  return '../../' + String(src).replace(/^\/+/, '');
}

/* Reads the real size of a picture stored on the site, straight out of the
   file header. Putting the true width and height on an <img> stops the page
   jumping about as pictures arrive, which is one of the things Google measures.
   Pictures uploaded through the dashboard live elsewhere and cannot be
   measured from here; those are left without a size rather than guessed at. */
async function imageSize(src) {
  if (!src || /^https?:\/\//i.test(src)) return null;

  const file = path.join(ROOT, String(src).replace(/^\/+/, ''));
  if (!existsSync(file)) return null;

  try {
    const b = await readFile(file);

    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = b.toString('ascii', 12, 16);
      if (chunk === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
      if (chunk === 'VP8L') {
        const bits = b.readUInt32LE(21);
        return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
    }

    if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') {
      return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    }

    if (b[0] === 0xff && b[1] === 0xd8) {                       // JPEG
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const marker = b[i + 1];
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch {
    /* An unreadable picture is not a reason to stop building the page. */
  }
  return null;
}

/* Google Discover only shows a story with a large picture, and only counts a
   picture as large from 1200px across. Anything narrower still publishes — it
   simply will not be picked up by Discover, which is worth saying out loud. */
const DISCOVER_MIN_WIDTH = 1200;

/* Article bodies are written where the whole site is one folder deep — a link
   to the fees page is just "fees.html". Read from /news/<slug>/ that points at
   a page two levels down that does not exist, so every such link and picture is
   pointed back out. Addresses that already say where they are going — full
   URLs, anchors, mail and phone links — are left exactly as they are. */
const RELATIVE_REF = /(\s(?:href|src)=)"(?!https?:|\/\/|\/|#|mailto:|tel:|data:)([^"]+)"/gi;

const bodyForArticlePage = (html) => String(html ?? '').replace(RELATIVE_REF, (_, attr, url) => `${attr}"../../${url}"`);

/* A feed is read somewhere else entirely, so the same links have to become
   full web addresses rather than relative ones. */
const bodyForFeed = (html) => String(html ?? '').replace(RELATIVE_REF, (_, attr, url) => `${attr}"${SITE_URL}/${url}"`);

// ════════════════════════════════════════════════════════════════════════════
//  READING THE PUBLISHED ARTICLES
// ════════════════════════════════════════════════════════════════════════════

/* The database address and key already live in bsjs-data.js, where the website
   itself reads them. Taking them from there means there is only ever one copy
   to keep correct. */
async function supabaseCredentials() {
  const loader = await readFile(path.join(ROOT, 'bsjs-data.js'), 'utf8');
  const url = loader.match(/SUPABASE_URL\s*=\s*'([^']+)'/);
  const key = loader.match(/SUPABASE_ANON_KEY\s*=\s*\n?\s*'([^']+)'/);
  if (!url || !key) throw new Error('Could not read the database settings out of bsjs-data.js');
  return { url: url[1], key: key[1] };
}

async function fetchDashboardArticles() {
  const { url, key } = await supabaseCredentials();
  const endpoint = `${url}/rest/v1/articles?select=*&published=eq.true&order=date.desc`;
  const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`the dashboard database returned ${response.status}`);

  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('the dashboard database sent an unexpected response');
  return rows;
}

async function fetchWordPressPosts() {
  const response = await fetch(`${WP_API}/posts?_embed&per_page=30&status=publish`);
  if (!response.ok) throw new Error(`WordPress returned ${response.status}`);
  const posts = await response.json();
  if (!Array.isArray(posts)) throw new Error('WordPress sent an unexpected response');
  return posts;
}

/* WordPress category ids, mapped the same way news.html maps them. */
function wpCategory(ids = []) {
  const mapping = { 2: 'academics', 3: 'sports', 4: 'events', 5: 'clubs' };
  for (const id of ids) if (mapping[id]) return mapping[id];
  return 'academics';
}

function normaliseDashboardRow(row) {
  const published = `${row.date}${PUBLISH_TIME}${TZ}`;

  /* An article's own date is when the school says the news happened; updated_at
     is when the row was last saved. A bulk import can leave the second one long
     after the first, which is fine — but it must never come before it. */
  const modifiedRaw = row.updated_at || row.created_at || published;
  const modified = new Date(modifiedRaw) < new Date(published) ? published : new Date(modifiedRaw).toISOString();

  const title = decodeEntities(row.title);
  const category = CATEGORY_LABEL[row.category] ? row.category : 'academics';

  return {
    source: 'dashboard',
    slug: slugify(title),
    title,
    excerpt: decodeEntities(row.excerpt || '') || truncate(row.body, 180),
    body: row.body || '',
    category,
    color: row.color || 'navy',
    icon: row.icon || '',
    image: row.image_url || '',
    datePublished: published,
    dateModified: modified,
    author: row.author
      ? { type: 'Person', name: decodeEntities(row.author), role: SCHOOL.name,
          url: SITE_URL + '/index.html#about', href: '../../index.html#about' }
      : DEFAULT_AUTHOR,
    wpId: null
  };
}

function normaliseWordPressPost(post) {
  const category = wpCategory(post.categories);
  const featured = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
  const wpAuthor = post._embedded?.author?.[0];
  const defaultImages = {
    academics: 'images/news/Academics.webp', sports: 'images/news/Sports.webp',
    events: 'images/news/events.webp', clubs: 'images/news/Clubs.webp'
  };
  const icons = { academics: '📚', sports: '⚽', events: '🎉', clubs: '🎨' };
  const colors = { academics: 'navy', sports: 'red', events: 'green', clubs: 'gold' };
  const title = decodeEntities(post.title?.rendered || '');

  return {
    source: 'wordpress',
    slug: slugify(title),
    title,
    excerpt: truncate(post.excerpt?.rendered || post.content?.rendered, 180),
    body: post.content?.rendered || '',
    category,
    color: colors[category] || 'navy',
    icon: icons[category] || '📚',
    image: featured || defaultImages[category] || '',
    datePublished: post.date_gmt ? `${post.date_gmt}Z` : post.date,
    dateModified: post.modified_gmt ? `${post.modified_gmt}Z` : (post.date_gmt ? `${post.date_gmt}Z` : post.date),
    // A blog post carries a real person's name, and WordPress already hosts a
    // profile page for them — a stronger byline than the school's own, so it is
    // kept, and the profile is linked at its full address rather than rewritten.
    author: wpAuthor
      ? { type: 'Person', name: decodeEntities(wpAuthor.name), role: 'Bright Sparks Blog',
          url: wpAuthor.link || DEFAULT_AUTHOR.url, href: wpAuthor.link || DEFAULT_AUTHOR.href }
      : DEFAULT_AUTHOR,
    wpId: post.id
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE PIECES SHARED BY EVERY GENERATED ARTICLE
// ════════════════════════════════════════════════════════════════════════════

const NAV = `<nav>
  <a href="../../index.html" class="nav-logo">
    <img src="../../optimized/logo-200w.webp"
         srcset="../../optimized/logo-100w.webp 100w, ../../optimized/logo-200w.webp 200w"
         sizes="(max-width: 640px) 80px, 100px"
         width="100" height="54"
         alt="${esc(SCHOOL.name)} Logo" onerror="this.style.display='none'">
    <div class="nav-logo-text">
      <strong>${esc(SCHOOL.name)}</strong>
      <span>${esc(SCHOOL.motto)}</span>
    </div>
  </a>
  <ul class="nav-links">
    <li><a href="../../index.html">Home</a></li>
    <li><a href="../../index.html#about">About</a></li>
    <li><a href="../../admissions.html">Admissions</a></li>
    <li><a href="../../fees.html">Fees</a></li>
    <li><a href="../../news.html" class="active">News</a></li>
    <li><a href="../../calendar.html">Calendar</a></li>
    <li><a href="../../gallery.html">Gallery</a></li>
    <li><a href="../../resources.html">Resources</a></li>
    <li><a href="../../careers.html">Careers</a></li>
    <li><a href="../../index.html#contacts" class="btn-apply">Contact Us</a></li>
    <li><a href="../../admissions.html#apply" class="btn-green">Apply Online</a></li>
  </ul>
  <div class="hamburger" onclick="document.getElementById('mobileMenu').classList.toggle('open')">
    <span></span><span></span><span></span>
  </div>
</nav>
<div class="mobile-menu" id="mobileMenu">
  <a href="../../index.html">Home</a>
  <a href="../../index.html#about">About</a>
  <a href="../../admissions.html">Admissions</a>
  <a href="../../fees.html">Fees</a>
  <a href="../../news.html">News</a>
  <a href="../../calendar.html">Calendar</a>
  <a href="../../gallery.html">Gallery</a>
  <a href="../../resources.html">Resources</a>
  <a href="../../careers.html">Careers</a>
  <a href="../../index.html#contacts">Contact Us</a>
</div>`;

/* Google looks for these pages when judging whether a news site is accountable
   for what it publishes, so they sit in the footer of every article. */
const FOOTER = `<footer>
  <p>&copy; ${new Date().getFullYear()} ${esc(SCHOOL.name)} &mdash; ${esc(SCHOOL.locality)}, Uganda</p>
  <div class="footer-policy">
    <a href="../../index.html#about">About Us</a><span>&bull;</span>
    <a href="../../index.html#contacts">Contact</a><span>&bull;</span>
    <a href="../../news.html">All News</a><span>&bull;</span>
    <a href="../../cookies-policy.html">Cookies &amp; Privacy</a><span>&bull;</span>
    <a href="../../feed.xml">RSS Feed</a>
  </div>
</footer>`;

function publisherSchema() {
  return {
    '@type': 'NewsMediaOrganization',
    '@id': SITE_URL + '/#organization',
    name: SCHOOL.name,
    url: SITE_URL + '/',
    logo: { '@type': 'ImageObject', url: SCHOOL.logo, width: 1237, height: 667 },
    email: SCHOOL.email,
    telephone: SCHOOL.telephone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SCHOOL.street,
      addressLocality: SCHOOL.locality,
      addressCountry: SCHOOL.country
    }
  };
}

function authorSchema(author) {
  return { '@type': author.type, name: author.name, url: author.url };
}

// ════════════════════════════════════════════════════════════════════════════
//  ONE ARTICLE PAGE
// ════════════════════════════════════════════════════════════════════════════

function relatedCard(a) {
  const img = a.image
    ? `<div class="related-card-img"><img src="${esc(pageRelative(a.image))}" alt="" loading="lazy" width="320" height="180"></div>`
    : `<div class="related-card-img ${COLOR_CLASS[a.color] || 'navy-bg'}">${esc(a.icon)}</div>`;
  return `      <a class="related-card" href="../${esc(a.slug)}/">
        ${img}
        <div class="related-card-body">
          <div class="related-card-cat ${CATEGORY_CLASS[a.category]}">${esc(CATEGORY_LABEL[a.category])}</div>
          <div class="related-card-title">${esc(a.title)}</div>
          <div class="related-card-date">${esc(dateLabel(a.datePublished))}</div>
        </div>
      </a>`;
}

function articlePage(article, related) {
  const url = `${SITE_URL}/news/${article.slug}/`;
  const description = truncate(article.excerpt || article.body, 155);
  const imageAbs = absoluteUrl(article.image);
  const bodyText = stripTags(article.body);
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const wasUpdated = new Date(article.dateModified) - new Date(article.datePublished) > 60 * 60 * 1000;

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        '@id': url + '#article',
        headline: article.title.slice(0, 110),
        description,
        image: imageAbs ? [imageAbs] : undefined,
        datePublished: article.datePublished,
        dateModified: article.dateModified,
        author: authorSchema(article.author),
        publisher: { '@id': SITE_URL + '/#organization' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        articleSection: CATEGORY_LABEL[article.category],
        inLanguage: 'en-UG',
        isAccessibleForFree: true,
        wordCount: wordCount || undefined,
        url
      },
      publisherSchema(),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
          { '@type': 'ListItem', position: 2, name: 'News', item: SITE_URL + '/news.html' },
          { '@type': 'ListItem', position: 3, name: article.title, item: url }
        ]
      }
    ]
  };

  /* The lead picture is the first thing on screen, so it is loaded eagerly and
     at high priority — and given its true dimensions, so the text below it does
     not jump once it arrives. */
  const size = article.imageSize;
  const heroImage = article.image
    ? `  <figure class="article-hero">
    <img src="${esc(pageRelative(article.image))}" alt="${esc(article.title)}"${size ? ` width="${size.w}" height="${size.h}"` : ''} fetchpriority="high">
  </figure>
  <p class="article-hero-caption">${esc(CATEGORY_LABEL[article.category])} &mdash; ${esc(SCHOOL.name)}, ${esc(SCHOOL.locality)}</p>
`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
${GENERATED_MARK}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(article.title)} | ${esc(SCHOOL.name)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">

<!-- Large images and full snippets are what get an article into Discover. -->
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="author" content="${esc(article.author.name)}">

<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(SCHOOL.name)}">
<meta property="og:title" content="${esc(article.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="en_UG">
${imageAbs ? `<meta property="og:image" content="${esc(imageAbs)}">\n<meta property="og:image:alt" content="${esc(article.title)}">` : ''}
<meta property="article:published_time" content="${esc(article.datePublished)}">
<meta property="article:modified_time" content="${esc(article.dateModified)}">
<meta property="article:section" content="${esc(CATEGORY_LABEL[article.category])}">
<meta property="article:publisher" content="${esc(SITE_URL)}/">

<meta name="twitter:card" content="${imageAbs ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(article.title)}">
<meta name="twitter:description" content="${esc(description)}">
${imageAbs ? `<meta name="twitter:image" content="${esc(imageAbs)}">` : ''}

<link rel="icon" type="image/png" href="../../logo.png">
<link rel="apple-touch-icon" href="../../logo.png">
<link rel="alternate" type="application/rss+xml" title="${esc(SCHOOL.name)} News" href="../../feed.xml">

<link rel="stylesheet" href="../../fonts/montserrat.css">
<link rel="preload" as="font" type="font/woff2" crossorigin href="../../fonts/Montserrat-400-normal-latin.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="../../fonts/Montserrat-700-normal-latin.woff2">
<link rel="stylesheet" href="../../news-article.css">

<script type="application/ld+json">
${jsonLd(schema)}
</script>
</head>
<body>

${NAV}

<main class="article-wrap">

  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="../../index.html">Home</a>
    <span aria-hidden="true">&rsaquo;</span>
    <a href="../../news.html">News</a>
    <span aria-hidden="true">&rsaquo;</span>
    <span class="current">${esc(CATEGORY_LABEL[article.category])}</span>
  </nav>

  <article>
    <div class="article-kicker ${CATEGORY_CLASS[article.category]}">${esc(CATEGORY_LABEL[article.category])}</div>
    <h1 class="article-title">${esc(article.title)}</h1>
    ${article.excerpt ? `<p class="article-standfirst">${esc(stripTags(decodeEntities(article.excerpt)))}</p>` : ''}

    <div class="article-meta">
      <img class="byline-avatar" src="../../optimized/logo-200w.webp" alt="" width="42" height="42" onerror="this.style.display='none'">
      <div class="byline-text">
        <div class="byline-name">By <a href="${esc(article.author.href)}" rel="author">${esc(article.author.name)}</a></div>
        <div class="byline-role">${esc(article.author.role)}</div>
      </div>
      <div class="article-times">
        <span>Published <strong><time datetime="${esc(article.datePublished)}">${esc(timeLabel(article.datePublished))}</time></strong></span>
        ${wasUpdated ? `<span>Updated <strong><time datetime="${esc(article.dateModified)}">${esc(timeLabel(article.dateModified))}</time></strong></span>` : ''}
      </div>
    </div>

${heroImage}
    <div class="article-body">
${bodyForArticlePage(article.body)}
    </div>

    <div class="article-share">
      <span class="article-share-label">Share this story</span>
      <a class="share-btn" href="https://wa.me/?text=${encodeURIComponent(article.title + ' — ' + url)}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">Facebook</a>
      <button class="share-btn" id="copyLink" type="button" data-url="${esc(url)}">&#128279; Copy link</button>
    </div>
  </article>

${related.length ? `  <section class="related">
    <h2 class="related-heading">More <span>School News</span></h2>
    <div class="related-grid">
${related.map(relatedCard).join('\n')}
    </div>
  </section>` : ''}

  ${article.wpId ? `<section class="article-comments" id="articleComments" data-wp-id="${article.wpId}"></section>` : ''}

  <a class="back-to-news" href="../../news.html">&#8592; All news &amp; announcements</a>
</main>

${FOOTER}

<script>
  document.getElementById('copyLink').addEventListener('click', function () {
    var button = this;
    var done = function () {
      button.innerHTML = '&#10003; Copied!';
      button.classList.add('copied');
      setTimeout(function () { button.innerHTML = '&#128279; Copy link'; button.classList.remove('copied'); }, 2200);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(button.dataset.url).then(done);
    } else {
      var field = document.createElement('textarea');
      field.value = button.dataset.url;
      field.style.position = 'fixed'; field.style.opacity = '0';
      document.body.appendChild(field); field.select(); document.execCommand('copy');
      document.body.removeChild(field);
      done();
    }
  });
  document.querySelectorAll('.mobile-menu a').forEach(function (link) {
    link.addEventListener('click', function () { document.getElementById('mobileMenu').classList.remove('open'); });
  });
</script>
${article.wpId ? `<script src="../../news-comments.js"></script>
<script>
  var commentsHost = document.getElementById('articleComments');
  BSJSComments.render(commentsHost, Number(commentsHost.dataset.wpId));
</script>` : ''}
<script src="../../chatbot.js"></script>
<script src="../../cookies-banner.js"></script>
<script src="../../analytics.js"></script>
</body>
</html>
`;
}

// ════════════════════════════════════════════════════════════════════════════
//  SITEMAPS AND FEED
// ════════════════════════════════════════════════════════════════════════════

function sitemap(articles) {
  const newestStory = articles.length
    ? articles.map((a) => a.dateModified).sort().pop().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const pages = STATIC_PAGES.map(
    (p) => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <lastmod>${p.follows_news ? newestStory : p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  );

  const stories = articles.map(
    (a) => `  <url>
    <loc>${SITE_URL}/news/${a.slug}/</loc>
    <lastmod>${a.dateModified.slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
${GENERATED_MARK}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.concat(stories).join('\n')}
</urlset>
`;
}

/* A Google News sitemap is only allowed to describe articles from the last two
   days; anything older is ignored. A school does not publish daily, so most of
   the time that window is empty — and an empty sitemap is reported as an error
   in Search Console. The newest story is kept in the file to prevent that.
   Google will disregard it once it ages out, which is exactly what should
   happen. */
function newsSitemap(articles) {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const now = Date.now();

  const recent = articles.filter((a) => {
    const at = new Date(a.datePublished).getTime();
    return at >= cutoff && at <= now;
  });

  const chosen = recent.length ? recent : articles.filter((a) => new Date(a.datePublished).getTime() <= now).slice(0, 1);

  const entries = chosen.map(
    (a) => `  <url>
    <loc>${SITE_URL}/news/${a.slug}/</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(SCHOOL.name)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${a.datePublished}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>
  </url>`
  );

  return {
    xml: `<?xml version="1.0" encoding="UTF-8"?>
${GENERATED_MARK}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join('\n')}
</urlset>
`,
    freshCount: recent.length
  };
}

function rssFeed(articles) {
  const now = new Date().toUTCString();
  const items = articles.slice(0, 20).map((a) => {
    const url = `${SITE_URL}/news/${a.slug}/`;
    const image = absoluteUrl(a.image);
    return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(a.datePublished).toUTCString()}</pubDate>
      <category>${esc(CATEGORY_LABEL[a.category])}</category>
      <dc:creator>${esc(a.author.name)}</dc:creator>
      <description>${esc(truncate(a.excerpt || a.body, 300))}</description>
      <content:encoded><![CDATA[${(image ? `<p><img src="${image}" alt="${esc(a.title)}"></p>` : '') + bodyForFeed(a.body)}]]></content:encoded>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
${GENERATED_MARK}
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(SCHOOL.name)} — News &amp; Announcements</title>
    <link>${SITE_URL}/news.html</link>
    <description>News, announcements and events from ${esc(SCHOOL.name)} in Seguku, Kampala.</description>
    <language>en-UG</language>
    <copyright>Copyright ${new Date().getFullYear()} ${esc(SCHOOL.name)}</copyright>
    <lastBuildDate>${now}</lastBuildDate>
    <image>
      <url>${SCHOOL.logo}</url>
      <title>${esc(SCHOOL.name)}</title>
      <link>${SITE_URL}/news.html</link>
    </image>
    <atom:link rel="self" href="${SITE_URL}/feed.xml" type="application/rss+xml"/>
    <!-- WebSub: subscribers are told the moment this feed changes,
         instead of waiting to be crawled again. -->
    <atom:link rel="hub" href="${WEBSUB_HUB}"/>
${items.join('\n')}
  </channel>
</rss>
`;
}

/* Tells the WebSub hub the feed has changed. Subscribers — Google among them —
   are notified straight away rather than at the next crawl. */
async function pingHub() {
  const body = new URLSearchParams({ 'hub.mode': 'publish', 'hub.url': `${SITE_URL}/feed.xml` });
  const response = await fetch(WEBSUB_HUB, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) throw new Error(`the hub returned ${response.status}`);
}

// ════════════════════════════════════════════════════════════════════════════
//  WRITING THE GRID INTO news.html
// ════════════════════════════════════════════════════════════════════════════

/* Replaces whatever sits between a pair of BUILD markers in news.html. The
   markers are left in place so the next run can find the block again. */
function replaceBlock(html, name, replacement) {
  const start = `<!-- BUILD:${name}:START -->`;
  const end = `<!-- BUILD:${name}:END -->`;
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1) {
    throw new Error(`news.html is missing its BUILD:${name} markers — they must not be removed`);
  }
  return html.slice(0, from + start.length) + '\n' + replacement + '\n' + html.slice(to);
}

function cardHtml(a) {
  const img = a.image
    ? `      <div class="news-card-img"><img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy" width="320" height="170"></div>`
    : `      <div class="news-card-img ${COLOR_CLASS[a.color] || 'navy-bg'}">${esc(a.icon)}</div>`;

  /* Written from the site root: opening a story rewrites the address bar to
     /news/<slug>/, and a link relative to that would resolve one level too
     deep the next time somebody clicked a card. */
  return `    <article class="news-card" data-category="${esc(a.category)}" data-slug="${esc(a.slug)}">
    <a class="news-card-link" href="/news/${esc(a.slug)}/">
${img}
      <div class="news-card-body">
        <div class="news-card-cat ${CATEGORY_CLASS[a.category]}">${esc(CATEGORY_LABEL[a.category])}</div>
        <h3 class="news-card-title">${esc(a.title)}</h3>
        <p>${esc(stripTags(decodeEntities(a.excerpt)))}</p>
        <div class="news-card-footer">
          <time class="news-date" datetime="${esc(a.datePublished)}">${esc(dateLabel(a.datePublished))}</time>
          <span class="read-more">Read more &#8594;</span>
        </div>
      </div>
    </a>
    </article>`;
}

function pinnedHtml(rows) {
  if (!rows.length) return '';
  return rows
    .map(
      (row) => `    <div class="announcement" style="border-left-color:${esc(row.border_color || 'var(--gold)')}">
      <div class="ann-date">${esc(decodeEntities(row.pinned_label || 'Announcement'))}</div>
      <h2>${esc(decodeEntities(row.title))}</h2>
      <div class="ann-body">${row.body || ''}</div>
    </div>`
    )
    .join('\n');
}

/* The list page gets its own structured data: an ItemList naming each article
   in order, which is how Google reads a news index. */
function listSchema(articles) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': SITE_URL + '/news.html#webpage',
        url: SITE_URL + '/news.html',
        name: `News & Announcements | ${SCHOOL.name}`,
        description: `Latest news, announcements and events from ${SCHOOL.name} in Seguku, Kampala.`,
        inLanguage: 'en-UG',
        isPartOf: { '@id': SITE_URL + '/#website' },
        publisher: { '@id': SITE_URL + '/#organization' }
      },
      { '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL + '/', name: SCHOOL.name,
        publisher: { '@id': SITE_URL + '/#organization' }, inLanguage: 'en-UG' },
      publisherSchema(),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
          { '@type': 'ListItem', position: 2, name: 'News & Announcements', item: SITE_URL + '/news.html' }
        ]
      },
      {
        '@type': 'ItemList',
        name: `${SCHOOL.name} — latest news`,
        numberOfItems: articles.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: articles.slice(0, 20).map((a, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/news/${a.slug}/`,
          name: a.title
        }))
      }
    ]
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  CLEARING OUT PAGES FOR ARTICLES THAT ARE GONE
// ════════════════════════════════════════════════════════════════════════════

/* When a story is unpublished in the dashboard its page has to go too, or the
   site keeps serving an article the school has withdrawn. Only pages this
   script wrote are ever removed — the marker in the file is what proves it. */
async function removeWithdrawn(currentSlugs) {
  if (!existsSync(NEWS_DIR)) return [];

  const removed = [];
  for (const entry of await readdir(NEWS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || currentSlugs.has(entry.name)) continue;

    const page = path.join(NEWS_DIR, entry.name, 'index.html');
    if (!existsSync(page)) continue;
    if (!(await readFile(page, 'utf8')).includes(GENERATED_MARK)) continue;

    if (!CHECK_ONLY) await rm(path.join(NEWS_DIR, entry.name), { recursive: true, force: true });
    removed.push(entry.name);
  }
  return removed;
}

// ════════════════════════════════════════════════════════════════════════════
//  THE BUILD
// ════════════════════════════════════════════════════════════════════════════

async function write(file, contents, ignore) {
  const full = path.join(ROOT, file);

  /* Rewriting a file with contents it already has would show up as a change in
     git and, on the scheduled runs, produce a commit every half hour saying
     nothing happened.

     `ignore` covers the one part of a file that changes on its own: the feed
     records the moment it was built, which differs on every run even when not
     one word of the news has. Comparing without it keeps an unchanged feed
     unchanged. */
  if (existsSync(full)) {
    const current = await readFile(full, 'utf8');
    const same = ignore
      ? current.replace(ignore, '') === contents.replace(ignore, '')
      : current === contents;
    if (same) return false;
  }
  if (CHECK_ONLY) return true;

  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, contents, 'utf8');
  return true;
}

async function main() {
  /* Nothing to build — just tell the hub the feed it already knows about has
     changed. Checks the feed is really reachable first, because pointing the
     hub at a page that is not there yet achieves nothing. */
  if (PING_ONLY) {
    console.log(`\n  Telling the WebSub hub that ${SITE_URL}/feed.xml has changed…\n`);
    const live = await fetch(`${SITE_URL}/feed.xml`, { method: 'HEAD' }).catch(() => null);
    if (!live || !live.ok) {
      console.error('  ✗ The feed could not be read at that address.');
      console.error('    Upload feed.xml to the server first, then run this again.\n');
      process.exit(1);
    }
    await pingHub();
    console.log('  ✓ Hub notified. Subscribers will fetch the new feed.\n');
    return;
  }

  console.log(`\n  Bright Sparks — building the news pages${CHECK_ONLY ? ' (check only, nothing will be written)' : ''}`);
  console.log(`  Site address: ${SITE_URL}\n`);

  const [dashboard, wordpress] = await Promise.allSettled([fetchDashboardArticles(), fetchWordPressPosts()]);

  /* The dashboard is where the school's own news lives. Without it there is
     nothing to build, and quietly writing a half-empty site over a good one
     would be worse than stopping. */
  if (dashboard.status === 'rejected') {
    console.error(`  ✗ Could not read the published articles: ${dashboard.reason.message}`);
    console.error('    Nothing was written. The pages already on the site are untouched.\n');
    process.exit(1);
  }

  if (wordpress.status === 'rejected') {
    console.warn(`  ! The WordPress blog was unreachable (${wordpress.reason.message}).`);
    console.warn('    Building with dashboard articles only.\n');
  }

  const rows = dashboard.value;
  const pinnedRows = rows.filter((r) => r.pinned);

  const articles = [
    ...rows.filter((r) => !r.pinned).map(normaliseDashboardRow),
    ...(wordpress.status === 'fulfilled' ? wordpress.value.map(normaliseWordPressPost) : [])
  ]
    .filter((a) => a.slug && a.title)
    .sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));

  /* Two stories that reduce to the same address would overwrite one another.
     The newer one keeps the address; the older is skipped and reported. */
  const seen = new Set();
  const unique = [];
  for (const a of articles) {
    if (seen.has(a.slug)) {
      console.warn(`  ! Two articles share the address "${a.slug}" — keeping the newer one.`);
      console.warn(`    Skipped: "${a.title}" (${a.datePublished.slice(0, 10)})`);
      continue;
    }
    seen.add(a.slug);
    unique.push(a);
  }

  console.log(`  ${unique.length} published articles (${rows.filter((r) => !r.pinned).length} from the dashboard, ` +
              `${wordpress.status === 'fulfilled' ? wordpress.value.length : 0} from WordPress), ` +
              `${pinnedRows.length} pinned announcement${pinnedRows.length === 1 ? '' : 's'}.\n`);

  // ── Picture sizes, measured once ────────────────────────────────────────
  const tooSmall = [];
  for (const article of unique) {
    article.imageSize = await imageSize(article.image);
    if (!article.image) tooSmall.push({ title: article.title, why: 'has no picture at all' });
    else if (article.imageSize && article.imageSize.w < DISCOVER_MIN_WIDTH) {
      tooSmall.push({ title: article.title, why: `picture is only ${article.imageSize.w}px wide` });
    }
  }

  // ── Article pages ───────────────────────────────────────────────────────
  let written = 0;
  for (const article of unique) {
    const related = unique
      .filter((other) => other.slug !== article.slug)
      .sort((a, b) => {
        const sameCategory = (x) => (x.category === article.category ? 0 : 1);
        return sameCategory(a) - sameCategory(b) || new Date(b.datePublished) - new Date(a.datePublished);
      })
      .slice(0, 3);

    if (await write(path.join('news', article.slug, 'index.html'), articlePage(article, related))) {
      written++;
      console.log(`  → news/${article.slug}/`);
    }
  }
  if (!written) console.log('  Every article page is already up to date.');

  const removed = await removeWithdrawn(seen);
  for (const slug of removed) console.log(`  ✗ removed news/${slug}/ — no longer published`);

  // ── Sitemaps and feed ───────────────────────────────────────────────────
  const news = newsSitemap(unique);
  const changed = [];
  if (await write('sitemap.xml', sitemap(unique))) changed.push('sitemap.xml');
  if (await write('news-sitemap.xml', news.xml)) changed.push('news-sitemap.xml');
  if (await write('feed.xml', rssFeed(unique), /<lastBuildDate>.*<\/lastBuildDate>/)) changed.push('feed.xml');

  console.log(`\n  News sitemap: ${news.freshCount} article${news.freshCount === 1 ? '' : 's'} published in the last 48 hours` +
              `${news.freshCount ? '' : ' — the newest story is listed instead, so the file is never empty'}.`);

  // ── news.html ───────────────────────────────────────────────────────────
  let page = await readFile(path.join(ROOT, 'news.html'), 'utf8');
  page = replaceBlock(page, 'JSONLD', `<script type="application/ld+json">\n${jsonLd(listSchema(unique))}\n</script>`);
  page = replaceBlock(page, 'PINNED', pinnedHtml(pinnedRows));
  page = replaceBlock(page, 'CARDS', unique.map(cardHtml).join('\n'));
  if (await write('news.html', page)) changed.push('news.html');

  if (changed.length) console.log(`  Updated: ${changed.join(', ')}`);

  /* Worth repeating at the end of every build, because it is the one thing the
     code cannot fix for the school: Discover will not pick up a story whose
     lead picture is small, however good the rest of the setup is. */
  if (tooSmall.length) {
    console.log(`\n  Google Discover needs a lead picture at least ${DISCOVER_MIN_WIDTH}px wide.`);
    console.log(`  ${tooSmall.length} article${tooSmall.length === 1 ? '' : 's'} will not qualify as things stand:`);
    for (const item of tooSmall) console.log(`    • ${item.title} — ${item.why}`);
    console.log('  These still publish and still appear in Search; only Discover skips them.');
  }

  // ── WebSub ──────────────────────────────────────────────────────────────
  /* Only when the feed actually changed. The hub is told about news, not about
     the fact that the script ran again. */
  if (SHOULD_PING && !CHECK_ONLY && changed.includes('feed.xml')) {
    try {
      await pingHub();
      console.log('  → WebSub hub notified: the feed has changed.');
    } catch (error) {
      console.warn(`  ! Could not notify the WebSub hub: ${error.message}`);
    }
  }

  console.log('\n  Done.\n');
}

main().catch((error) => {
  console.error(`\n  Build failed: ${error.message}\n`);
  process.exit(1);
});
