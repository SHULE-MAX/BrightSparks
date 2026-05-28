(function () {
  var STORAGE_KEY = 'bsjs_cookies_accepted';
  if (localStorage.getItem(STORAGE_KEY)) return;

  var style = document.createElement('style');
  style.textContent = [
    '#bscookie-bar{',
    'position:fixed;bottom:0;left:0;right:0;z-index:10000;',
    'background:linear-gradient(135deg,#1A2E6E,#203580);',
    'color:#fff;padding:14px 20px;',
    'display:flex;align-items:center;justify-content:space-between;',
    'gap:16px;flex-wrap:wrap;',
    'box-shadow:0 -4px 24px rgba(26,46,110,0.35);',
    'border-top:3px solid #D32F2F;',
    'font-family:Montserrat,sans-serif;font-size:0.8rem;line-height:1.55;',
    'transform:translateY(100%);transition:transform 0.4s cubic-bezier(0.34,1.26,0.64,1);}',
    '#bscookie-bar.bscookie-show{transform:translateY(0);}',
    '#bscookie-text{flex:1;min-width:220px;color:rgba(255,255,255,0.88);}',
    '#bscookie-text strong{color:#fff;font-weight:700;}',
    '#bscookie-text a{color:#F5C252;font-weight:600;text-decoration:underline;}',
    '#bscookie-text a:hover{color:#fff;}',
    '#bscookie-actions{display:flex;gap:10px;align-items:center;flex-shrink:0;}',
    '#bscookie-accept{',
    'background:#D32F2F;color:#fff;border:none;cursor:pointer;',
    'padding:9px 22px;border-radius:8px;font-size:0.8rem;font-weight:700;',
    'font-family:Montserrat,sans-serif;transition:background 0.2s;white-space:nowrap;}',
    '#bscookie-accept:hover{background:#B71C1C;}',
    '#bscookie-learn{',
    'background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.25);',
    'cursor:pointer;padding:9px 16px;border-radius:8px;font-size:0.8rem;font-weight:600;',
    'font-family:Montserrat,sans-serif;transition:background 0.2s;white-space:nowrap;',
    'text-decoration:none;display:inline-block;}',
    '#bscookie-learn:hover{background:rgba(255,255,255,0.22);}',
    '@media(max-width:600px){',
    '#bscookie-bar{padding:12px 14px;}',
    '#bscookie-actions{width:100%;justify-content:flex-end;}}'
  ].join('');
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.id = 'bscookie-bar';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Cookie notice');
  bar.innerHTML = [
    '<div id="bscookie-text">',
    '<strong>We use cookies</strong> — This site uses cookies from Google Maps and Google Fonts',
    ' to provide mapping and typography features. By continuing to use this site, you agree to',
    ' our use of cookies.',
    ' <a href="cookies-policy.html">Learn more →</a>',
    '</div>',
    '<div id="bscookie-actions">',
    '<a id="bscookie-learn" href="cookies-policy.html">Cookie Policy</a>',
    '<button id="bscookie-accept">Accept &amp; Continue</button>',
    '</div>'
  ].join('');
  document.body.appendChild(bar);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      bar.classList.add('bscookie-show');
    });
  });

  document.getElementById('bscookie-accept').addEventListener('click', function () {
    localStorage.setItem(STORAGE_KEY, '1');
    bar.style.transition = 'transform 0.3s ease';
    bar.style.transform = 'translateY(100%)';
    setTimeout(function () { bar.remove(); }, 320);
  });
})();
