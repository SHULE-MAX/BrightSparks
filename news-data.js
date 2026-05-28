// ════════════════════════════════════════════════════════════════════════════
//  NEWS DATA — shared between news.html and gallery.html
//
//  To add a new article, copy the template below into the ARTICLES array,
//  fill in the fields, and save. The article will appear on the news page
//  and any image will also appear in the gallery (under the matching filter).
//
//  Template:
//  {
//    date:      'YYYY-MM-DD',        // used for sorting — newest shown first
//    dateLabel: 'Month DD, YYYY',    // displayed on the card
//    category:  'academics',         // academics | sports | events | clubs
//    color:     'navy',              // navy | red | green | gold | sky (fallback when no photo)
//    icon:      '📚',               // emoji shown when no photo is set
//    image:     'images/news/your-photo.webp',  // OPTIONAL — drop photo in images/news/ folder
//    title:     'Your headline here',
//    excerpt:   'One or two sentence preview shown on the card.',
//    body:      '<p>Full article text. You can use <strong>bold</strong>, lists, etc.</p>'
//              // To show a photo inside the article, add this inside body:
//              // '<img src="images/news/your-photo.webp" style="width:100%;border-radius:8px;margin:12px 0">'
//  }
//
//  To pin an announcement at the top, add:
//  {
//    pinned:      true,
//    pinnedLabel: '📌 PINNED — May 2026',
//    borderColor: 'var(--gold)',     // var(--gold) | var(--red) | var(--navy) | var(--green)
//    title:       'Announcement headline',
//    body:        'Announcement text. Can include <strong>HTML</strong>.'
//  }
// ════════════════════════════════════════════════════════════════════════════
var ARTICLES = [

  // ── PINNED ANNOUNCEMENTS (shown at top, not in the grid) ─────────────────
  {
    pinned: true,
    pinnedLabel: '📌 PINNED — May 2026',
    borderColor: 'var(--gold)',
    title: 'Term II 2026 Begins May 25, 2026',
    body: 'All pupils are expected to report on <strong> Monday, May 25, 2026</strong>. Please ensure all fees are cleared before reporting day. Parents will receive the complete Term II schedule, uniform list, and booklist at orientation. Contact the school office for any queries: <strong>+256 700 116 093</strong>.'
  },

  // ── ARTICLES (newest date first) ─────────────────────────────────────────
  {
    date:      '2026-05-25',
    dateLabel: 'May 25, 2026',
    category:  'academics',
    color:     'navy',
    icon:      '📚',
    image:     'images/news/Welcome.webp',
    title:     'Welcome Back to School for Term II 2026!',
    excerpt:   'The start of a new term brings exciting opportunities for learning and growth.',
    body:      '<p>Dear Parents and Guardians,<br><br>Warm greetings from Bright Sparks Junior School, Seguku-Katale! We are delighted to welcome you and your children back to school for the new term. A special welcome to our freshers and continuing students – we\'re excited to have you join us again.</p><p>At Bright Sparks, we believe that learning is an adventure. We are committed to walking with every child, encouraging them to embrace challenges, learn from mistakes, and grow into confident, capable young people.<br><br>Thank you for trusting us with your children\'s education and growth. We look forward to partnering with you this term to ensure a smooth, productive, and rewarding experience for every learner.<br><br>For any inquiries, feel free to reach us on:<br>📧 Email: brightsparksjuniorsch@gmail.com<br>📍 Location: Seguku, Katale off Entebbe Road<br>📱 WhatsApp: 0700116093<br>☎️ Tel: 0393242093<br><br>Once again, welcome back. Let\'s make this term a great one together!<br><br>Management<br>Bright Sparks Junior School<br>Day &amp; Boarding Kindergarten &amp; Primary School</p>'
  },

  {
    date: '2026-05-27',
    dateLabel: 'May 27, 2026',
    category: 'events',
    color: 'gold',
    icon: '🌙',
    image: 'images/news/EID.webp',
    title: 'Eid Al Adhuha — School Closed May 27',
    excerpt: 'In observance of Eid Al Adhuha, there will be no classes on Wednesday, May 27, 2026. We wish all our Muslim families a blessed celebration.',
    body: '<p>In observance of Eid Al Adhuha — the Day of Sacrifice commemorating the faith demonstrated by Prophet Ibrahim — there will be no classes on <strong>Wednesday, May 27, 2026</strong>.</p><p>We wish all our Muslim families, staff, and pupils a blessed and joyful celebration. School resumes on Thursday, May 28 (Reporting Day for Term II).</p>'
  },
  {
    date: '2026-04-24',
    dateLabel: 'April 24, 2026',
    category: 'academics',
    color: 'navy',
    icon: '📋',
    title: 'Term II 2026 Roadmap Released by Head Teacher',
    excerpt: 'Head Teacher Muneeb Ali Wanyeni has released the comprehensive Term II 2026 roadmap including the full calendar, educational tours for all classes, and key dates for parents.',
    body: '<p>Head Teacher Muneeb Ali Wanyeni has released the comprehensive Term II 2026 roadmap, covering all key dates, educational tours, assessment schedules, and school events.</p><p><strong>Key Term II dates:</strong></p><ul><li>May 25 — Reporting Day (Term II begins)</li><li>June 3 — Martyrs\' Day (Public Holiday)</li><li>June 10 — Assessment Exams Begin</li><li>June 12 — Colour Day (Kindergarten)</li><li>June 22 — Mid-Term Exams</li><li>July 11 — Academic Day &amp; Club Exhibitions</li><li>July 14–21 — Educational Tours (P.1–P.7)</li><li>July 28 — End of Term Exams Begin</li><li>August 13 — Fun Day (Kindergarten)</li><li>August 14 — Term Closure</li></ul><p>Parents are encouraged to review the full calendar on our <a href="calendar.html" style="color:var(--navy);font-weight:700;">School Calendar</a> page.</p>'
  },
  {
    date: '2026-04-10',
    dateLabel: 'Term I, 2026',
    category: 'sports',
    color: 'red',
    icon: '⚽',
    image: 'images/news/Sports.webp',
    title: 'Football Team Wins Against St. James Junior School',
    excerpt: 'Our football team emerged victorious in a thrilling match against St. James Junior School, greatly boosting school spirit and pride across the campus.',
    body: '<p>In an exciting inter-school football fixture held during Term I 2026, the Bright Sparks Junior School football team emerged victorious against St. James Junior School.</p><p>The match, played at our school grounds, saw our pupils demonstrate excellent teamwork, discipline, and sportsmanship throughout. The final score drew loud celebrations from pupils, staff, and parents who attended.</p><p>Head Teacher Muneeb Ali Wanyeni congratulated the team: <strong>"This win is a reflection of the hard work, dedication, and team spirit our pupils bring every day — both on and off the pitch."</strong></p><p>The school continues to encourage participation in sports as part of its holistic education approach.</p>'
  },
  {
    date: '2026-05-10',
    dateLabel: 'May 2026',
    category: 'clubs',
    color: 'gold',
    icon: '🍰',
    image: 'images/news/Clubs.webp',
    title: 'Cookery &amp; Baking Club Prepares for Academic Day Exhibition',
    excerpt: 'Our young chefs in the Cookery &amp; Baking Club have been busy preparing for the Academic Day &amp; Club Exhibitions scheduled for July 11, 2026.',
    body: '<p>The Bright Sparks Cookery &amp; Baking Club has been working hard in preparation for the Academic Day &amp; Club Exhibitions on <strong>July 11, 2026</strong>.</p><p>Under the guidance of their club teacher, pupils have been mastering recipes ranging from cakes and biscuits to savoury dishes. The club meets bi-weekly each term and has grown into one of the most popular co-curricular activities at the school.</p><p>Parents, guardians, and the wider school community are warmly invited to attend Academic Day and see the pupils\' creations firsthand. More details on timing and venue will be shared closer to the date.</p>'
  },
  {
    date: '2026-05-15',
    dateLabel: 'July 14–21, 2026',
    category: 'events',
    color: 'green',
    icon: '✈️',
    image: 'images/news/events.webp',
    title: 'Educational Tours for P.1–P.7 — July 2026',
    excerpt: 'Educational tours are planned for all classes from July 14–21, 2026. Destinations include the Airport &amp; Zoo, Source of the Nile, and Murchison Falls.',
    body: '<p>Exciting educational tours are planned for all classes from <strong>July 14–21, 2026</strong>. This is a highlight of the Term II calendar and a wonderful learning experience for every pupil.</p><p><strong>Tour destinations by class:</strong></p><ul><li><strong>P.1 – P.2:</strong> Entebbe Airport &amp; Uganda Wildlife Conservation Centre (Zoo)</li><li><strong>P.3 – P.4:</strong> Source of the Nile, Jinja</li><li><strong>P.5 – P.7:</strong> Murchison Falls National Park</li><li><strong>Kindergarten:</strong> Local educational site (details to follow)</li></ul><p>Tour fees are separate from term fees. Please see our <a href="fees.html" style="color:var(--navy);font-weight:700;">Fees Structure</a> page or contact the school office for details. Consent forms and payment schedules will be distributed during the first weeks of term.</p>'
  },
  {
    date: '2026-06-12',
    dateLabel: 'June 12, 2026',
    category: 'events',
    color: 'sky',
    icon: '🎨',
    title: 'Colour Day — Kindergarten Section (June 12)',
    excerpt: 'Kindergarten pupils and their families are invited to celebrate Colour Day on June 12, 2026. Children are encouraged to dress in their favourite colours.',
    body: '<p>Our Kindergarten section will celebrate <strong>Colour Day on Friday, June 12, 2026</strong> — a vibrant, fun-filled day for our youngest learners and their families.</p><p>Children are encouraged to come dressed in their favourite colour or a mix of bright colours. The day will include themed activities, games, singing, and a special surprise for each class.</p><p>Parents and guardians are warmly welcome to join us for part of the celebration. More details on timings will be shared via the class WhatsApp groups and school notice board.</p>'
  },
  {
    date: '2026-07-11',
    dateLabel: 'July 11, 2026',
    category: 'academics',
    color: 'red',
    icon: '🏆',
    image: 'images/news/Academics.webp',
    title: 'Academic Day &amp; Club Exhibitions — July 11, 2026',
    excerpt: 'Join us for our annual Academic Day and Club Exhibitions. Pupils will showcase their academic progress and club achievements. All parents and guardians are warmly invited.',
    body: '<p>Bright Sparks Junior School warmly invites all parents, guardians, and friends to our annual <strong>Academic Day &amp; Club Exhibitions on Saturday, July 11, 2026</strong>.</p><p>This is one of the most celebrated events in our school calendar. Pupils from all classes will display their academic work, creative projects, and the achievements of their co-curricular clubs including:</p><ul><li>Music — Piano &amp; Guitar performances</li><li>Cookery &amp; Baking — tasting display</li><li>Chess &amp; Checkers — live demonstrations</li><li>Ballet &amp; Modelling — performance showcase</li><li>Swimming — certificate presentations</li></ul><p>Academic progress reports and class performance highlights will also be shared with parents during the event.</p><p>Entry is free. Refreshments will be available. We look forward to seeing you!</p>'
  }

]; // end of ARTICLES array
