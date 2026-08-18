-- ════════════════════════════════════════════════════════════════════════════
--  BRIGHT SPARKS — ONE-TIME SEED
--
--  This copies the content that is currently hardcoded in the website's HTML
--  into the database, so the dashboard opens with all your existing calendar
--  events, news, resources and gallery photos already in it — ready to edit.
--
--  HOW TO APPLY
--  1. Run schema.sql first.
--  2. SQL Editor → New query → paste this whole file → Run.
--
--  RUN THIS ONCE ONLY. Running it again would create duplicates.
--
--  Note on images and PDFs: these rows point at files that already live on the
--  school's own web server (e.g. "images/assets/ictlab.webp"). Nothing needs to
--  be re-uploaded. Anything you add from the dashboard in future is stored in
--  Supabase instead, and both kinds work side by side.
-- ════════════════════════════════════════════════════════════════════════════


-- ═══ CALENDAR EVENTS — from calendar.html ════════════════════════════════════
insert into public.events (date, end_date, label, description, type) values
  ('2026-05-25', null, 'Reporting Day',          'Term II begins — all pupils report to school', 'key'),
  ('2026-05-27', null, 'Eid Al Adhuha',          'Day for Sacrificing animals in rememberance of Faith demonstrated by Prophet Ibrahim', 'holiday'),
  ('2026-06-03', null, 'Martyrs'' Day',          'Public Holiday — school closed', 'holiday'),
  ('2026-06-09', null, 'Heroes Day',             'Instituted in 2001, the public holiday commemorates citizens and combatants who sacrificed their lives for the country, specifically recognizing those who fought during the Ugandan Bush War (1981–1986).', 'holiday'),
  ('2026-06-10', null, 'Assessment Exams Begin', 'Term II continuous assessments start', 'exam'),
  ('2026-06-12', null, 'Colour Day',             'Kindergarten Section', 'event-type'),
  ('2026-06-22', null, 'Mid-Term Exams',         'Mid-term assessments for all classes', 'key'),
  ('2026-07-11', null, 'Academic & Club Day',    'Academic Day & Club Exhibitions', 'event-type'),
  ('2026-07-14', '2026-07-21', 'Educational Tours', 'P.1 – P.7 educational excursions', 'event-type'),
  ('2026-07-28', null, 'End of Term Exams',      'Final examinations begin — all classes', 'exam'),
  ('2026-08-13', null, 'Fun Day',                'Kindergarten Section', 'event-type'),
  ('2026-08-14', null, 'Term Closure',           'Official end of Term II — collection day', 'key');


-- ═══ NEWS — from news-data.js ════════════════════════════════════════════════
-- The $body$...$body$ wrappers let the article HTML contain quotes and
-- apostrophes without any escaping. They are not part of the stored text.

-- Pinned announcement
insert into public.articles (date, title, body, pinned, pinned_label, border_color, category, color, icon, excerpt)
values (
  '2026-05-01',
  'Term II 2026 Begins May 25, 2026',
  $body$All pupils are expected to report on <strong> Monday, May 25, 2026</strong>. Please ensure all fees are cleared before reporting day. Parents will receive the complete Term II schedule, uniform list, and booklist at orientation. Contact the school office for any queries: <strong>+256 700 116 093</strong>.$body$,
  true,
  '📌 PINNED — May 2026',
  'var(--gold)',
  'academics', 'navy', '📌', ''
);

insert into public.articles (date, category, color, icon, image_url, title, excerpt, body) values
(
  '2026-05-25', 'academics', 'navy', '📚', 'images/news/Welcome.webp',
  'Welcome Back to School for Term II 2026!',
  'The start of a new term brings exciting opportunities for learning and growth.',
  $body$<p>Dear Parents and Guardians,<br><br>Warm greetings from Bright Sparks Junior School, Seguku-Katale! We are delighted to welcome you and your children back to school for the new term. A special welcome to our freshers and continuing students – we're excited to have you join us again.</p><p>At Bright Sparks, we believe that learning is an adventure. We are committed to walking with every child, encouraging them to embrace challenges, learn from mistakes, and grow into confident, capable young people.<br><br>Thank you for trusting us with your children's education and growth. We look forward to partnering with you this term to ensure a smooth, productive, and rewarding experience for every learner.<br><br>For any inquiries, feel free to reach us on:<br>📧 Email: brightsparksjuniorsch@gmail.com<br>📍 Location: Seguku, Katale off Entebbe Road<br>📱 WhatsApp: 0700116093<br>☎️ Tel: 0393242093<br><br>Once again, welcome back. Let's make this term a great one together!<br><br>Management<br>Bright Sparks Junior School<br>Day &amp; Boarding Kindergarten &amp; Primary School</p>$body$
),
(
  '2026-05-27', 'events', 'gold', '🌙', 'images/news/EID.webp',
  'Eid Al Adhuha — School Closed May 27',
  'In observance of Eid Al Adhuha, there will be no classes on Wednesday, May 27, 2026. We wish all our Muslim families a blessed celebration.',
  $body$<p>In observance of Eid Al Adhuha — the Day of Sacrifice commemorating the faith demonstrated by Prophet Ibrahim — there will be no classes on <strong>Wednesday, May 27, 2026</strong>.</p><p>We wish all our Muslim families, staff, and pupils a blessed and joyful celebration. School resumes on Thursday, May 28 (Reporting Day for Term II).</p>$body$
),
(
  '2026-04-24', 'academics', 'navy', '📋', null,
  'Term II 2026 Roadmap Released by Head Teacher',
  'Head Teacher Muneeb Ali Wanyeni has released the comprehensive Term II 2026 roadmap including the full calendar, educational tours for all classes, and key dates for parents.',
  $body$<p>Head Teacher Muneeb Ali Wanyeni has released the comprehensive Term II 2026 roadmap, covering all key dates, educational tours, assessment schedules, and school events.</p><p><strong>Key Term II dates:</strong></p><ul><li>May 25 — Reporting Day (Term II begins)</li><li>June 3 — Martyrs' Day (Public Holiday)</li><li>June 10 — Assessment Exams Begin</li><li>June 12 — Colour Day (Kindergarten)</li><li>June 22 — Mid-Term Exams</li><li>July 11 — Academic Day &amp; Club Exhibitions</li><li>July 14–21 — Educational Tours (P.1–P.7)</li><li>July 28 — End of Term Exams Begin</li><li>August 13 — Fun Day (Kindergarten)</li><li>August 14 — Term Closure</li></ul><p>Parents are encouraged to review the full calendar on our <a href="calendar.html" style="color:var(--navy);font-weight:700;">School Calendar</a> page.</p>$body$
),
(
  '2026-04-10', 'sports', 'red', '⚽', 'images/news/Sports.webp',
  'Football Team Wins Against St. James Junior School',
  'Our football team emerged victorious in a thrilling match against St. James Junior School, greatly boosting school spirit and pride across the campus.',
  $body$<p>In an exciting inter-school football fixture held during Term I 2026, the Bright Sparks Junior School football team emerged victorious against St. James Junior School.</p><p>The match, played at our school grounds, saw our pupils demonstrate excellent teamwork, discipline, and sportsmanship throughout. The final score drew loud celebrations from pupils, staff, and parents who attended.</p><p>Head Teacher Muneeb Ali Wanyeni congratulated the team: <strong>"This win is a reflection of the hard work, dedication, and team spirit our pupils bring every day — both on and off the pitch."</strong></p><p>The school continues to encourage participation in sports as part of its holistic education approach.</p>$body$
),
(
  '2026-05-10', 'clubs', 'gold', '🍰', 'images/news/Clubs.webp',
  'Cookery & Baking Club Prepares for Academic Day Exhibition',
  'Our young chefs in the Cookery & Baking Club have been busy preparing for the Academic Day & Club Exhibitions scheduled for July 11, 2026.',
  $body$<p>The Bright Sparks Cookery &amp; Baking Club has been working hard in preparation for the Academic Day &amp; Club Exhibitions on <strong>July 11, 2026</strong>.</p><p>Under the guidance of their club teacher, pupils have been mastering recipes ranging from cakes and biscuits to savoury dishes. The club meets bi-weekly each term and has grown into one of the most popular co-curricular activities at the school.</p><p>Parents, guardians, and the wider school community are warmly invited to attend Academic Day and see the pupils' creations firsthand. More details on timing and venue will be shared closer to the date.</p>$body$
),
(
  '2026-05-15', 'events', 'green', '✈️', 'images/news/events.webp',
  'Educational Tours for P.1–P.7 — July 2026',
  'Educational tours are planned for all classes from July 14–21, 2026. Destinations include the Airport & Zoo, Source of the Nile, and Murchison Falls.',
  $body$<p>Exciting educational tours are planned for all classes from <strong>July 14–21, 2026</strong>. This is a highlight of the Term II calendar and a wonderful learning experience for every pupil.</p><p><strong>Tour destinations by class:</strong></p><ul><li><strong>P.1 – P.2:</strong> Entebbe Airport &amp; Uganda Wildlife Conservation Centre (Zoo)</li><li><strong>P.3 – P.4:</strong> Source of the Nile, Jinja</li><li><strong>P.5 – P.7:</strong> Murchison Falls National Park</li><li><strong>Kindergarten:</strong> Local educational site (details to follow)</li></ul><p>Tour fees are separate from term fees. Please see our <a href="fees.html" style="color:var(--navy);font-weight:700;">Fees Structure</a> page or contact the school office for details. Consent forms and payment schedules will be distributed during the first weeks of term.</p>$body$
),
(
  '2026-06-12', 'events', 'sky', '🎨', null,
  'Colour Day — Kindergarten Section (June 12)',
  'Kindergarten pupils and their families are invited to celebrate Colour Day on June 12, 2026. Children are encouraged to dress in their favourite colours.',
  $body$<p>Our Kindergarten section will celebrate <strong>Colour Day on Friday, June 12, 2026</strong> — a vibrant, fun-filled day for our youngest learners and their families.</p><p>Children are encouraged to come dressed in their favourite colour or a mix of bright colours. The day will include themed activities, games, singing, and a special surprise for each class.</p><p>Parents and guardians are warmly welcome to join us for part of the celebration. More details on timings will be shared via the class WhatsApp groups and school notice board.</p>$body$
),
(
  '2026-07-11', 'academics', 'red', '🏆', 'images/news/Academics.webp',
  'Academic Day & Club Exhibitions — July 11, 2026',
  'Join us for our annual Academic Day and Club Exhibitions. Pupils will showcase their academic progress and club achievements. All parents and guardians are warmly invited.',
  $body$<p>Bright Sparks Junior School warmly invites all parents, guardians, and friends to our annual <strong>Academic Day &amp; Club Exhibitions on Saturday, July 11, 2026</strong>.</p><p>This is one of the most celebrated events in our school calendar. Pupils from all classes will display their academic work, creative projects, and the achievements of their co-curricular clubs including:</p><ul><li>Music — Piano &amp; Guitar performances</li><li>Cookery &amp; Baking — tasting display</li><li>Chess &amp; Checkers — live demonstrations</li><li>Ballet &amp; Modelling — performance showcase</li><li>Swimming — certificate presentations</li></ul><p>Academic progress reports and class performance highlights will also be shared with parents during the event.</p><p>Entry is free. Refreshments will be available. We look forward to seeing you!</p>$body$
);


-- ═══ RESOURCES — from resources.html ═════════════════════════════════════════
insert into public.resources (title, description, category, meta_label, file_url, file_size_bytes, position) values
(
  'Term II Roadmap Circular',
  'Official Term II communication to parents covering the term schedule, key dates, fees deadlines, and school expectations for the term.',
  'circular', 'Term II 2026',
  'Resources/School Circular_ Term II Roadmap.pdf', 213960, 1
),
(
  'Draft Rules & Regulations',
  'The school''s official rules and regulations governing pupil conduct, discipline, uniform, attendance, and general school expectations for all enrolled pupils.',
  'rules', 'Rules and Regulations 2026',
  'Resources/Draft Rules and Regulations.pdf', 176538, 2
),
(
  'Term II Newsletter 2026',
  'Highlights from Term II upcoming events.',
  'newsletter', 'Term II 2026',
  'Resources/Term II 2026 Opening Circular.pdf', 201571, 3
),
(
  'School Routine',
  'The official school daily and weekly routine showing the timetable structure, lesson periods, break times, and activity schedules across all classes.',
  'workplan', 'School Routine 2026',
  'Resources/SCHOOL ROUTINE.pdf', 57485, 4
);


-- ═══ GALLERY PHOTOS — from gallery.html ══════════════════════════════════════
insert into public.gallery_photos (title, caption, category, image_url, position) values
  ('ICT Computer Lab',        'Facilities', 'facilities', 'images/assets/ictlab.webp',                  1),
  ('School Library',          'Facilities', 'facilities', 'images/assets/library.webp',                 2),
  ('School Grounds',          'Facilities', 'facilities', 'images/general/school-building.webp',        3),
  ('Sports Day',              'Sports',     'sports',     'images/general/sports.webp',                 4),
  ('Music, Dance & Drama',    'Events',     'events',     'images/general/MDD.webp',                    5),
  ('School Excursions & Tours','Events',    'events',     'images/general/TOURS.webp',                  6),
  ('Welcome Back Ceremony',   'Events',     'events',     'images/news/Welcome.webp',                   7),
  ('School Director',         'Staff',      'staff',      'Director.webp',                             8),
  ('Head Teacher',            'Staff',      'staff',      'head teacher.webp',                          9),
  ('Deputy Head Teacher',     'Staff',      'staff',      'images/general/Deputy Head Teacher.webp',   10),
  ('Head of Kindergarten',    'Staff',      'staff',      'images/general/HeadKindergarten.webp',      11);


-- ═══ TIKTOK VIDEOS — from gallery.html ═══════════════════════════════════════
insert into public.tiktok_videos (tiktok_id, title, position) values
  ('7560582960806694200', 'Prom Party Entry!',  1),
  ('7632982581956332818', 'Parent Testimonies', 2);
