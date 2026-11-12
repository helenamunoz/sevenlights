-- SevenLights — starter content. Run once, after schema.sql.
--
-- Challenges suggested by the app have no creator and carry is_official. The
-- breathing practice is the first; the texts are original to SevenLights.

insert into public.challenges
  (is_official, title, description, duration_days, locale, missed_rule, light, timer_seconds)
values
  (true, '5 minutos de respiración consciente',
   'Cinco minutos por día, veintiún días. Sentate donde estés, soltá los hombros y seguí el aire: entra por la nariz, sale despacio. Cuando la cabeza se vaya, volvé a la respiración sin retarte. Eso es toda la práctica.',
   21, 'es', 'calendar', 'anahata', 300),
  (true, '5 minutes of mindful breathing',
   'Five minutes a day for twenty-one days. Sit wherever you are, drop your shoulders and follow the air: in through the nose, slowly out. When your mind wanders, come back to the breath without scolding yourself. That is the whole practice.',
   21, 'en', 'calendar', 'anahata', 300);

insert into public.challenge_days (challenge_id, day_number, body)
select c.id, d.n, d.body
from public.challenges c
join (values
  ('es',  1, 'Hoy solo llegá. Cinco minutos de notar que estás respirando.'),
  ('es',  7, 'Una semana. Notá si algo cambió en cómo te sentás a empezar.'),
  ('es', 14, 'Dos semanas. Probá alargar un poco la exhalación.'),
  ('es', 21, 'Último día. Agradecete haber vuelto, cada vez que volviste.'),
  ('en',  1, 'Today, just arrive. Five minutes of noticing that you are breathing.'),
  ('en',  7, 'One week. Notice whether anything has changed in how you sit down to begin.'),
  ('en', 14, 'Two weeks. Try letting the out-breath run a little longer.'),
  ('en', 21, 'Last day. Thank yourself for coming back, every time you came back.')
) as d (locale, n, body) on d.locale = c.locale
where c.is_official and c.duration_days = 21 and c.timer_seconds = 300;

-- To make yourself an admin (you can then hide reported content from the app),
-- sign in once, then run this with your email:
--
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'you@example.com';
