/* ════════════════════════════════════════════════════════════════════════════
 *  BRIGHT SPARKS — VISIT COUNTER
 *
 *  Records one anonymous row per page view so the school can see how its
 *  website is being used, in the Website Manager dashboard.
 *
 *  What it records: the page address, which website the visitor arrived from,
 *  whether they are on a phone/tablet/computer, and a random number that ties
 *  together the pages of a single visit.
 *
 *  What it does NOT do: set any cookie, store anything that survives closing
 *  the tab, record names, IP addresses or anything identifying a person, or
 *  share anything with an advertising company. Because it holds no personal
 *  data it needs no consent prompt — the cookie banner is unaffected.
 *
 *  Requires bsjs-data.js to be loaded first (it supplies the database address).
 * ════════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.BSJS || !window.BSJS.configured) return;

  // Never count the people building or previewing the site.
  var host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '' || host.indexOf('192.168.') === 0) {
    return;
  }

  // Search-engine crawlers and link previewers would badly distort the figures.
  var ua = navigator.userAgent || '';
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|gtmetrix|preview/i.test(ua)) {
    return;
  }

  // Respect an explicit "do not track me" from the browser.
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  /* One random id per browser tab. It lives in sessionStorage, so it is gone
     the moment the tab closes — this is what lets the dashboard say "40 people
     visited" rather than only "120 pages were opened", without identifying
     anybody or leaving anything behind. */
  var SESSION_KEY = 'bsjs_visit';
  var sessionId;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch (e) {
    // Private browsing can block storage; count the view as its own visit.
    sessionId = Math.random().toString(36).slice(2, 12);
  }

  function deviceType() {
    if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function browserName() {
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\/|Opera/.test(ua)) return 'Opera';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
    if (/Firefox\//.test(ua)) return 'Firefox';
    return 'Other';
  }

  /* Only the referring site is kept, never the full address someone came from,
     which could carry search terms or private query strings. */
  function referringSite() {
    if (!document.referrer) return '';
    try {
      var url = new URL(document.referrer);
      return url.hostname === location.hostname ? '' : url.origin;
    } catch (e) {
      return '';
    }
  }

  var payload = {
    path: location.pathname || '/',
    referrer: referringSite(),
    session_id: sessionId,
    device: deviceType(),
    browser: browserName(),
    screen_w: window.screen ? window.screen.width : null,
  };

  var url = window.BSJS.SUPABASE_URL + '/rest/v1/page_views';
  var headers = {
    'Content-Type': 'application/json',
    apikey: window.BSJS.SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + window.BSJS.SUPABASE_ANON_KEY,
    Prefer: 'return=minimal',
  };

  /* keepalive lets the request finish even if the visitor immediately clicks
     through to another page. sendBeacon cannot be used here because it does
     not allow the authorisation headers the database requires.
     Any failure is swallowed on purpose — counting visits must never be able
     to slow down or break the website for a parent. */
  try {
    fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      keepalive: true,
      mode: 'cors',
    })['catch'](function () {});
  } catch (e) {
    /* ignored */
  }
})();
