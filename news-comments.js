/* ════════════════════════════════════════════════════════════════════════════
 *  BRIGHT SPARKS — ARTICLE COMMENTS
 *
 *  Comments live in the school's WordPress install, so only articles that came
 *  from WordPress have a thread. This file is shared by two places:
 *
 *    • news.html          — inside the "Read more" modal
 *    • news/<slug>/       — the standalone article pages built by build-news.mjs
 *
 *  Both call the same function:
 *
 *      BSJSComments.render(containerElement, wordpressPostId);
 *
 *  The container is filled with the thread and a "Leave a Comment" form. If
 *  WordPress cannot be reached the container shows a short notice instead —
 *  the article itself is never affected.
 * ════════════════════════════════════════════════════════════════════════════ */

window.BSJSComments = (function () {
  'use strict';

  var API = 'https://brightsparksjunior.ac.ug/wp/wp-json/wp/v2';

  /* Everything below is written by visitors, so it is escaped before it goes
     anywhere near innerHTML — including the author's name. */
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : String(name).slice(0, 2).toUpperCase();
  }

  /* A stable colour per commenter, so the same parent keeps the same avatar. */
  function avatarColor(name) {
    var palette = ['#1A2E6E', '#B71C1C', '#1B6B3A', '#B8860B', '#1565A0', '#6A1B9A', '#00695C', '#C75000'];
    var h = 0;
    for (var i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return palette[Math.abs(h) % palette.length];
  }

  function commentHtml(c) {
    var d = new Date(c.date);
    var dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var text = String(c.content && c.content.rendered ? c.content.rendered : '')
      .replace(/<[^>]*>/g, '')
      .trim();
    var name = c.author_name || 'Anonymous';

    /* Gravatar's default is a generated image; swapping it for 404 lets the
       initials underneath show through for parents with no Gravatar. */
    var gravUrl = c.author_avatar_urls && (c.author_avatar_urls['48'] || c.author_avatar_urls['96'] || '');
    if (gravUrl) gravUrl = gravUrl.replace(/([?&]d=)[^&]*/g, '$1404');

    return '<div class="comment-item">' +
        '<div class="comment-avatar" style="background:' + avatarColor(name) + '">' +
          esc(initials(name)) +
          (gravUrl ? '<img src="' + esc(gravUrl) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
        '</div>' +
        '<div class="comment-content">' +
          '<div class="comment-meta">' +
            '<span class="comment-author">' + esc(name) + '</span>' +
            '<time class="comment-date" datetime="' + esc(c.date_gmt ? c.date_gmt + 'Z' : c.date) + '">' + esc(dateStr) + '</time>' +
          '</div>' +
          '<div class="comment-text">' + esc(text) + '</div>' +
        '</div>' +
      '</div>';
  }

  function formHtml() {
    return '<form class="comment-form" id="commentForm">' +
      '<p class="comment-form-title">Leave a Comment</p>' +
      '<div class="comment-form-row">' +
        '<input type="text" id="cName" placeholder="Your name *" autocomplete="name" required>' +
        '<input type="email" id="cEmail" placeholder="Email address *" autocomplete="email" required>' +
      '</div>' +
      '<textarea id="cText" placeholder="Write your comment here&#8230;" required></textarea>' +
      '<button type="submit" class="comment-submit" id="cSubmit">Post Comment</button>' +
      '<span class="comment-note">Your email is never published. Comments are reviewed before appearing.</span>' +
    '</form>';
  }

  function submit(el, wpId) {
    var btn = el.querySelector('#cSubmit');
    var form = el.querySelector('#commentForm');
    var payload = {
      post: wpId,
      author_name: el.querySelector('#cName').value.trim(),
      author_email: el.querySelector('#cEmail').value.trim(),
      content: el.querySelector('#cText').value.trim()
    };

    btn.disabled = true;
    btn.textContent = 'Posting…';
    var oldError = el.querySelector('#cError');
    if (oldError) oldError.remove();

    fetch(API + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (r.status === 201 || r.status === 200) {
          form.innerHTML =
            '<p class="comment-success">&#10003; Thank you! Your comment has been submitted and will appear after review.</p>';
          return;
        }
        return r.json().then(function (data) {
          throw new Error(data && data.message ? data.message : 'HTTP ' + r.status);
        });
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Post Comment';
        var p = document.createElement('p');
        p.id = 'cError';
        p.className = 'comment-error-msg';
        p.textContent = err && err.message ? err.message : 'Could not post comment. Please try again.';
        form.appendChild(p);
      });
  }

  function render(el, wpId) {
    if (!el || !wpId) return;

    el.innerHTML =
      '<div class="comments-divider"></div>' +
      '<p class="comments-loading">Loading comments&#8230;</p>';

    fetch(API + '/comments?post=' + encodeURIComponent(wpId) + '&per_page=50&orderby=date&order=asc')
      .then(function (r) { return r.json(); })
      .then(function (comments) {
        if (!Array.isArray(comments)) {
          throw new Error(comments && comments.message ? comments.message : 'Unexpected response');
        }

        var html = '<div class="comments-divider"></div>' +
          '<h2 class="comments-heading">&#128172; ' + comments.length +
          ' Comment' + (comments.length !== 1 ? 's' : '') + '</h2>';

        if (comments.length) {
          html += '<div class="comment-list">' + comments.map(commentHtml).join('') + '</div>';
        } else {
          html += '<p class="no-comments">No comments yet. Be the first!</p>';
        }

        el.innerHTML = html + formHtml();
        el.querySelector('#commentForm').addEventListener('submit', function (e) {
          e.preventDefault();
          submit(el, wpId);
        });
      })
      .catch(function () {
        el.innerHTML =
          '<div class="comments-divider"></div>' +
          '<p class="comments-error">Comments could not be loaded.</p>';
      });
  }

  return { render: render };
})();
