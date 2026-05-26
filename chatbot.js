(function () {
  var faqs = [
    {
      keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
      answer: 'Hello! Welcome to <strong>Bright Sparks Junior School</strong>. 👋<br><br>I can help you with fees, admissions, transport, school hours, contacts and more. What would you like to know?'
    },
    {
      keywords: ['fee', 'fees', 'tuition', 'cost', 'price', 'how much', 'pay', 'payment', 'charges'],
      answer: 'Our fees per term (UGX):\n\n• <strong>Kindergarten — Day:</strong> 900,000/=\n• <strong>Primary — Day:</strong> 1,000,000/=\n• <strong>Boarding (all levels):</strong> 1,250,000/=\n• <strong>Registration:</strong> 50,000/= (once-off)\n\nAll fees include meals, club fees & stationery. <a href="fees.html">View full fee structure →</a>'
    },
    {
      keywords: ['admission', 'admissions', 'apply', 'enroll', 'enrol', 'register', 'join', 'application', 'how to join', 'start'],
      answer: 'Admissions are open all year round! Here are the steps:\n\n1. Contact us or visit the school\n2. Submit form + required documents\n3. Child attends entry assessment\n4. Pay UGX 50,000 registration fee\n5. Attend orientation & receive welcome pack\n\n<a href="admissions.html">Full admissions guide →</a>'
    },
    {
      keywords: ['document', 'documents', 'required', 'requirement', 'bring', 'what to bring', 'paperwork'],
      answer: 'Documents needed for admission:\n\n• 2 passport photos of the child\n• 1 passport photo of each parent/guardian\n• National ID copy of each parent/guardian\n• Child\'s immunisation card or birth certificate\n• Sketch map of home area\n• Active contact numbers for parents\n\n<a href="admissions.html">Full admissions guide →</a>'
    },
    {
      keywords: ['transport', 'bus', 'route', 'routes', 'pick up', 'pickup', 'drop off', 'dropoff', 'commute'],
      answer: 'School bus transport is optional:\n\n• <strong>One way:</strong> UGX 250,000/term\n• <strong>Two way:</strong> UGX 500,000/term\n• <strong>Sibling discount:</strong> 20% off\n\nRoutes: Zana, Nyanama, Namasuba, Buddo, Kajjansi, Kitende, Bwebajja, Seguku, Lweza, Kigo & surrounding areas.'
    },
    {
      keywords: ['contact', 'phone', 'call', 'email', 'reach', 'talk', 'speak', 'telephone', 'number'],
      answer: 'You can reach us at:\n\n📞 <a href="tel:+256700116093">+256 700 116 093</a>\n📞 <a href="tel:+256393242093">+256 393 242 093</a>\n📧 <a href="mailto:brightsparksjuniorsch@gmail.com">brightsparksjuniorsch@gmail.com</a>\n\nOr visit: Seguku-Katale, Entebbe Road, Kampala.'
    },
    {
      keywords: ['location', 'address', 'where', 'directions', 'map', 'find', 'situated', 'based', 'place'],
      answer: 'We are located at:\n\n<strong>Seguku-Katale, Entebbe Road</strong>\nWakiso District, Kampala, Uganda\n\n<a href="https://maps.google.com/?q=Seguku+Katale+Entebbe+Road+Kampala+Uganda" target="_blank">Open in Google Maps →</a>'
    },
    {
      keywords: ['hours', 'time', 'opening', 'school day', 'start', 'end', 'close', 'open', 'when does'],
      answer: 'School hours are:\n\n⏰ <strong>7:30 am – 5:30 pm</strong>\n\nBoarding students remain on campus overnight with supervised evening prep (homework time).'
    },
    {
      keywords: ['boarding', 'dormitory', 'hostel', 'residential', 'sleep', 'overnight', 'stay'],
      answer: 'Our <strong>Boarding Section</strong> offers:\n\n✓ All meals (breakfast, lunch & supper)\n✓ Mattress provided\n✓ Supervised evening prep\n✓ Available for all levels (KG – P.7)\n\nBoarding fee: <strong>UGX 1,250,000/term</strong> (all-inclusive).'
    },
    {
      keywords: ['uniform', 'clothes', 'dress', 'attire', 'outfit'],
      answer: 'Uniform costs (UGX):\n\n<strong>Kindergarten:</strong> Boys 300,000/= | Girls 290,000/=\n<strong>Primary:</strong> Boys 340,000/= | Girls 330,000/=\n<strong>Labeling:</strong> 20,000/= (all)\n\nThe full uniform list is given at orientation.'
    },
    {
      keywords: ['class', 'classes', 'grade', 'grades', 'level', 'levels', 'kindergarten', 'primary', 'curriculum', 'year', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
      answer: 'We offer:\n\n• <strong>Kindergarten:</strong> Baby Class, Middle Class, Top Class\n• <strong>Primary:</strong> Primary 1 – Primary 7\n\nBoth Day and Boarding sections available at all levels. Admissions are ongoing!'
    },
    {
      keywords: ['portal', 'login', 'parent portal', 'teacher portal', 'log in', 'account', 'online'],
      answer: 'Access the Parent/Teacher Portal here:\n\n🔗 <a href="https://app.brightsparksjunior.ac.ug" target="_blank">app.brightsparksjunior.ac.ug →</a>\n\nFor login issues, contact the school office.'
    },
    {
      keywords: ['news', 'events', 'announcements', 'updates', 'happening', 'latest'],
      answer: 'Stay updated with the latest from Bright Sparks!\n\n📰 <a href="news.html">Visit our News & Announcements page →</a>\n\nAlso follow us on Facebook, Instagram, TikTok, and X.'
    },
    {
      keywords: ['club', 'clubs', 'activities', 'extracurricular', 'sport', 'music', 'swim', 'swimming', 'chess', 'ballet', 'cooking', 'cookery'],
      answer: 'School clubs (bi-weekly, one per term):\n\n🎵 Music — Piano & Guitar\n🏊 Swimming\n🍳 Cookery & Bakery\n♟ Chess & Checkers\n🩰 Ballet & Modelling\n\nClub fees are <strong>included in tuition</strong>!'
    },
    {
      keywords: ['thank', 'thanks', 'thank you', 'appreciate', 'helpful', 'great', 'good', 'perfect'],
      answer: 'You\'re welcome! 😊 Is there anything else I can help you with?\n\nFeel free to <a href="mailto:brightsparksjuniorsch@gmail.com">email us</a> or call <a href="tel:+256700116093">+256 700 116 093</a> for more information.'
    },
    {
      keywords: ['sibling', 'siblings', 'brother', 'sister', 'discount', 'more than one', 'two children', 'multiple children'],
      answer: 'Siblings receive a <strong>20% discount on transport fees</strong>.\n\nFor any other sibling arrangements or questions, please contact our school office:\n📞 <a href="tel:+256700116093">+256 700 116 093</a>'
    },
    {
      keywords: ['social', 'facebook', 'instagram', 'tiktok', 'twitter', 'follow'],
      answer: 'Follow Bright Sparks on social media:\n\n📘 <a href="https://www.facebook.com/brightsparksjunior" target="_blank">Facebook</a>\n📸 <a href="https://www.instagram.com/brightsparksjunior" target="_blank">Instagram</a>\n🎵 <a href="https://www.tiktok.com/@brightsparksjunior" target="_blank">TikTok</a>\n🐦 <a href="https://www.x.com/brightsparksjr" target="_blank">X (Twitter)</a>'
    }
  ];

  var quickReplies = [
    { label: 'School Fees', query: 'What are the school fees?' },
    { label: 'How to Apply', query: 'How do I apply for admission?' },
    { label: 'Transport', query: 'Tell me about transport routes' },
    { label: 'Contact Us', query: 'How can I contact the school?' },
    { label: 'School Hours', query: 'What are the school hours?' }
  ];

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#bsbot-btn{position:fixed;bottom:24px;right:24px;width:58px;height:58px;border-radius:50%;',
    'background:#1A2E6E;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(26,46,110,0.4);',
    'display:flex;align-items:center;justify-content:center;z-index:9998;',
    'transition:transform 0.2s,box-shadow 0.2s;}',
    '#bsbot-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(26,46,110,0.55);}',
    '#bsbot-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;',
    'background:#D32F2F;border-radius:50%;border:2px solid #fff;',
    'animation:bsbot-pulse 2s infinite;}',
    '@keyframes bsbot-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.25);}}',
    '#bsbot-window{position:fixed;bottom:92px;right:24px;width:355px;',
    'max-height:530px;background:#fff;border-radius:20px;',
    'box-shadow:0 8px 40px rgba(26,46,110,0.22);display:flex;flex-direction:column;',
    'z-index:9999;overflow:hidden;transform:scale(0.85) translateY(20px);opacity:0;',
    'pointer-events:none;transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s;}',
    '#bsbot-window.bsbot-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}',
    '#bsbot-header{background:linear-gradient(135deg,#1A2E6E,#2B42A0);',
    'padding:13px 14px;display:flex;align-items:center;gap:10px;',
    'border-bottom:3px solid #D32F2F;flex-shrink:0;}',
    '#bsbot-avatar{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.15);',
    'display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0;}',
    '#bsbot-header-text{flex:1;min-width:0;}',
    '#bsbot-header-text strong{display:block;color:#fff;font-size:0.83rem;font-weight:700;',
    'font-family:Montserrat,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#bsbot-header-text span{color:rgba(255,255,255,0.65);font-size:0.68rem;}',
    '#bsbot-wa{display:flex;align-items:center;gap:5px;background:#25D366;color:#fff;',
    'border:none;cursor:pointer;padding:5px 10px;border-radius:20px;',
    'font-size:0.68rem;font-weight:700;font-family:Montserrat,sans-serif;',
    'text-decoration:none;white-space:nowrap;flex-shrink:0;',
    'transition:background 0.2s;}',
    '#bsbot-wa:hover{background:#1ebe5d;}',
    '#bsbot-close{background:none;border:none;cursor:pointer;padding:5px;',
    'color:rgba(255,255,255,0.7);border-radius:6px;transition:background 0.2s;line-height:1;flex-shrink:0;}',
    '#bsbot-close:hover{background:rgba(255,255,255,0.15);color:#fff;}',
    '#bsbot-messages{flex:1;overflow-y:auto;padding:12px 11px;display:flex;',
    'flex-direction:column;gap:9px;scroll-behavior:smooth;}',
    '#bsbot-messages::-webkit-scrollbar{width:3px;}',
    '#bsbot-messages::-webkit-scrollbar-thumb{background:rgba(26,46,110,0.18);border-radius:2px;}',
    '.bsbot-msg{display:flex;gap:7px;align-items:flex-end;',
    'animation:bsbot-in 0.2s ease;}',
    '@keyframes bsbot-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}',
    '.bsbot-msg.bsbot-bot{flex-direction:row;}',
    '.bsbot-msg.bsbot-user{flex-direction:row-reverse;}',
    '.bsbot-msg-av{width:26px;height:26px;border-radius:50%;flex-shrink:0;',
    'background:rgba(26,46,110,0.1);display:flex;align-items:center;',
    'justify-content:center;font-size:0.85rem;}',
    '.bsbot-bubble{max-width:83%;padding:9px 13px;border-radius:16px;',
    'font-size:0.79rem;line-height:1.58;font-family:Montserrat,sans-serif;word-break:break-word;}',
    '.bsbot-msg.bsbot-bot .bsbot-bubble{background:#eef1fb;color:#1A1A2E;border-bottom-left-radius:4px;}',
    '.bsbot-msg.bsbot-user .bsbot-bubble{background:#1A2E6E;color:#fff;border-bottom-right-radius:4px;}',
    '.bsbot-bubble a{color:#E8A020;font-weight:600;}',
    '.bsbot-msg.bsbot-user .bsbot-bubble a{color:#F5C252;}',
    '#bsbot-qr{padding:6px 10px 4px;display:flex;flex-wrap:wrap;gap:5px;',
    'border-top:1px solid rgba(26,46,110,0.08);flex-shrink:0;}',
    '.bsbot-qr-btn{background:rgba(26,46,110,0.07);border:1px solid rgba(26,46,110,0.18);',
    'color:#1A2E6E;font-size:0.7rem;font-weight:600;padding:5px 10px;border-radius:20px;',
    'cursor:pointer;transition:all 0.18s;font-family:Montserrat,sans-serif;white-space:nowrap;}',
    '.bsbot-qr-btn:hover{background:#1A2E6E;color:#fff;border-color:#1A2E6E;}',
    '#bsbot-input-row{padding:7px 9px 9px;display:flex;gap:6px;',
    'border-top:1px solid rgba(26,46,110,0.08);flex-shrink:0;}',
    '#bsbot-input{flex:1;padding:9px 12px;border:1.5px solid rgba(26,46,110,0.15);',
    'border-radius:20px;font-size:0.79rem;font-family:Montserrat,sans-serif;',
    'outline:none;color:#1A1A2E;transition:border-color 0.2s;background:#fff;}',
    '#bsbot-input:focus{border-color:#1A2E6E;}',
    '#bsbot-send{width:36px;height:36px;border-radius:50%;background:#D32F2F;',
    'border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'transition:background 0.2s;flex-shrink:0;}',
    '#bsbot-send:hover{background:#B71C1C;}',
    '.bsbot-typing{display:flex;gap:4px;align-items:center;padding:9px 13px;',
    'background:#eef1fb;border-radius:16px;border-bottom-left-radius:4px;width:fit-content;}',
    '.bsbot-dot{width:7px;height:7px;border-radius:50%;background:#1A2E6E;opacity:0.5;',
    'animation:bsbot-dot 1.2s infinite;}',
    '.bsbot-dot:nth-child(2){animation-delay:0.2s;}',
    '.bsbot-dot:nth-child(3){animation-delay:0.4s;}',
    '@keyframes bsbot-dot{0%,80%,100%{transform:scale(1);opacity:0.5;}40%{transform:scale(1.3);opacity:1;}}',
    '@media(max-width:480px){',
    '#bsbot-window{width:calc(100vw - 20px);right:10px;bottom:84px;}',
    '#bsbot-btn{bottom:14px;right:14px;}}'
  ].join('');
  document.head.appendChild(style);

  // ── HTML ────────────────────────────────────────────────────────────────────
  var qrHtml = quickReplies.map(function (q) {
    return '<button class="bsbot-qr-btn" data-query="' + q.query + '">' + q.label + '</button>';
  }).join('');

  var wrapper = document.createElement('div');
  wrapper.innerHTML = [
    '<button id="bsbot-btn" aria-label="Chat with Bright Sparks" title="Chat with us">',
    '  <div id="bsbot-badge"></div>',
    '  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"',
    '       stroke-linecap="round" stroke-linejoin="round">',
    '    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    '  </svg>',
    '</button>',
    '<div id="bsbot-window" role="dialog" aria-label="Bright Sparks School Chat">',
    '  <div id="bsbot-header">',
    '    <div id="bsbot-avatar">🎓</div>',
    '    <div id="bsbot-header-text">',
    '      <strong>Bright Sparks Assistant</strong>',
    '      <span>Online — usually replies instantly</span>',
    '    </div>',
    '    <a id="bsbot-wa" href="https://wa.me/256700116093?text=Hello%2C%20I%27d%20like%20to%20enquire%20about%20Bright%20Sparks%20Junior%20School" target="_blank" rel="noopener" title="Chat with admin on WhatsApp">',
    '      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    '      WhatsApp',
    '    </a>',
    '    <button id="bsbot-close" aria-label="Close chat">',
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"',
    '           stroke-width="2.5" stroke-linecap="round">',
    '        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '  <div id="bsbot-messages"></div>',
    '  <div id="bsbot-qr">' + qrHtml + '</div>',
    '  <div id="bsbot-input-row">',
    '    <input id="bsbot-input" type="text" placeholder="Ask a question…" autocomplete="off" maxlength="200" />',
    '    <button id="bsbot-send" aria-label="Send">',
    '      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white"',
    '           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">',
    '        <line x1="22" y1="2" x2="11" y2="13"/>',
    '        <polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '</div>'
  ].join('');
  document.body.appendChild(wrapper);

  // ── References ──────────────────────────────────────────────────────────────
  var btn    = document.getElementById('bsbot-btn');
  var win    = document.getElementById('bsbot-window');
  var close  = document.getElementById('bsbot-close');
  var msgs   = document.getElementById('bsbot-messages');
  var input  = document.getElementById('bsbot-input');
  var send   = document.getElementById('bsbot-send');
  var badge  = document.getElementById('bsbot-badge');
  var opened = false;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function toggleChat() {
    opened = !opened;
    win.classList.toggle('bsbot-open', opened);
    if (opened) {
      badge.style.display = 'none';
      if (msgs.children.length === 0) greet();
      setTimeout(function () { input.focus(); }, 300);
    }
  }

  function addMsg(html, role) {
    var div = document.createElement('div');
    div.className = 'bsbot-msg bsbot-' + role;
    var av = document.createElement('div');
    av.className = 'bsbot-msg-av';
    av.textContent = role === 'bot' ? '🎓' : '👤';
    var bubble = document.createElement('div');
    bubble.className = 'bsbot-bubble';
    bubble.innerHTML = html.replace(/\n/g, '<br>');
    div.appendChild(av);
    div.appendChild(bubble);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'bsbot-msg bsbot-bot';
    var av = document.createElement('div');
    av.className = 'bsbot-msg-av';
    av.textContent = '🎓';
    var dots = document.createElement('div');
    dots.className = 'bsbot-typing';
    dots.innerHTML = '<div class="bsbot-dot"></div><div class="bsbot-dot"></div><div class="bsbot-dot"></div>';
    div.appendChild(av);
    div.appendChild(dots);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function greet() {
    var typing = showTyping();
    setTimeout(function () {
      msgs.removeChild(typing);
      addMsg('Hello! Welcome to <strong>Bright Sparks Junior School</strong>. 👋<br><br>I can help you with fees, admissions, transport, school hours, contacts and more. What would you like to know?', 'bot');
    }, 700);
  }

  function findAnswer(query) {
    var q = query.toLowerCase();
    for (var i = 0; i < faqs.length; i++) {
      var kws = faqs[i].keywords;
      for (var j = 0; j < kws.length; j++) {
        if (q.indexOf(kws[j]) !== -1) return faqs[i].answer;
      }
    }
    return 'I\'m not sure about that, but you can reach us directly:\n\n📞 <a href="tel:+256700116093">+256 700 116 093</a>\n📧 <a href="mailto:brightsparksjuniorsch@gmail.com">brightsparksjuniorsch@gmail.com</a>\n\nOr explore: <a href="admissions.html">Admissions</a> · <a href="fees.html">Fees</a> · <a href="news.html">News</a>';
  }

  function handleSend(text) {
    text = text.replace(/^\s+|\s+$/g, '');
    if (!text) return;
    input.value = '';
    addMsg(text, 'user');
    var typing = showTyping();
    setTimeout(function () {
      msgs.removeChild(typing);
      addMsg(findAnswer(text), 'bot');
    }, 500);
  }

  // ── Events ───────────────────────────────────────────────────────────────────
  btn.addEventListener('click', toggleChat);
  close.addEventListener('click', toggleChat);
  send.addEventListener('click', function () { handleSend(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') handleSend(input.value);
  });

  var qrBtns = document.querySelectorAll('.bsbot-qr-btn');
  for (var k = 0; k < qrBtns.length; k++) {
    qrBtns[k].addEventListener('click', (function (q) {
      return function () { handleSend(q); };
    })(qrBtns[k].getAttribute('data-query')));
  }
})();
