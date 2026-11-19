import { batchWrite, put, update, type Item } from './db';

/**
 * Starter content: the challenges signed by the 7Lights team, across the
 * kinds of practice. The first ones are in both languages; the newer ones
 * are in English only while the app is. The texts are original to 7Lights.
 * Running this again changes nothing that people have done — a challenge row
 * is only written if it is not there yet.
 */

type Copy = { title: string; description: string; days: [number, string][] };

type TeamChallenge = {
  slug: string;
  /** Where it sits in the list. Never reuse a number: it is the row's date. */
  order: number;
  category: string;
  /** Beginning unless said otherwise. */
  level?: string;
  /** By the calendar unless said otherwise. */
  missed_rule?: string;
  duration_days: number;
  timer_seconds: number | null;
  light: string;
  /** Written while the app is English-only; Spanish follows when it is switched back on. */
  es?: Copy;
  en: Copy;
};

/** No longer offered. The rows stay for the people already doing them. */
const RETIRED = ['water'];

/** In the order the app lists them. */
const TEAM: TeamChallenge[] = [
  {
    slug: 'breathing',
    order: 0,
    category: 'breath',
    duration_days: 21,
    timer_seconds: 300,
    light: 'anahata',
    es: {
      title: '5 minutos de respiración consciente',
      description:
        'Cinco minutos por día, veintiún días. Sentate donde estés, soltá los hombros y seguí el aire: entra por la nariz, sale despacio. Cuando la cabeza se vaya, volvé a la respiración sin retarte. Eso es toda la práctica.',
      days: [
        [1, 'Hoy solo llegá. Cinco minutos de notar que estás respirando.'],
        [7, 'Una semana. Notá si algo cambió en cómo te sentás a empezar.'],
        [14, 'Dos semanas. Probá alargar un poco la exhalación.'],
        [21, 'Último día. Agradecete haber vuelto, cada vez que volviste.'],
      ],
    },
    en: {
      title: '5 minutes of mindful breathing',
      description:
        'Five minutes a day for twenty-one days. Sit wherever you are, drop your shoulders and follow the air: in through the nose, slowly out. When your mind wanders, come back to the breath without scolding yourself. That is the whole practice.',
      days: [
        [1, 'Today, just arrive. Five minutes of noticing that you are breathing.'],
        [7, 'One week. Notice whether anything has changed in how you sit down to begin.'],
        [14, 'Two weeks. Try letting the out-breath run a little longer.'],
        [21, 'Last day. Thank yourself for coming back, every time you came back.'],
      ],
    },
  },
  {
    slug: 'stillness',
    order: 1,
    category: 'meditation',
    duration_days: 14,
    timer_seconds: 600,
    light: 'sahasrara',
    es: {
      title: '10 minutos de quietud',
      description:
        'Diez minutos sentada o sentado, sin hacer nada. No hace falta vaciar la mente: alcanza con quedarte y mirar lo que pasa, como quien mira la calle desde una ventana. Elegí un lugar y, si podés, la misma hora cada día.',
      days: [
        [1, 'Elegí tu lugar. Hoy la única tarea es quedarte los diez minutos.'],
        [3, 'Cuando aparezca un pensamiento, ponele un nombre corto —"plan", "recuerdo"— y dejalo pasar.'],
        [7, 'Una semana. Hoy escuchá los sonidos, del más cercano al más lejano.'],
        [10, 'Si hoy cuesta, también cuenta. Quedate igual.'],
        [14, 'Último día. Antes de levantarte, notá cómo estás ahora.'],
      ],
    },
    en: {
      title: '10 minutes of stillness',
      description:
        'Ten minutes of sitting and doing nothing. You don’t have to empty your mind: staying and watching what goes by is enough, like looking at the street from a window. Pick a spot and, if you can, the same time each day.',
      days: [
        [1, 'Pick your spot. Today the only task is to stay for the ten minutes.'],
        [3, 'When a thought shows up, give it a short name — “plan”, “memory” — and let it pass.'],
        [7, 'One week. Today, listen to the sounds, from the nearest to the farthest.'],
        [10, 'If today is hard, it still counts. Stay anyway.'],
        [14, 'Last day. Before you get up, notice how you are right now.'],
      ],
    },
  },
  {
    slug: 'walk',
    order: 2,
    category: 'movement',
    duration_days: 14,
    timer_seconds: 1200,
    light: 'muladhara',
    es: {
      title: 'Una caminata de 20 minutos, sin pantalla',
      description:
        'Veinte minutos de caminar con el teléfono guardado. Sin auriculares, sin fotos, sin apuro. A la vuelta de la manzana o por donde te quede cómodo: lo que importa es salir y mirar.',
      days: [
        [1, 'Salí sin destino. Diez minutos de ida, diez de vuelta.'],
        [4, 'Hoy buscá tres cosas que nunca habías mirado en tu recorrido.'],
        [7, 'Una semana. Cambiá de dirección: para el otro lado.'],
        [11, 'Caminá un poco más lento de lo que te sale.'],
        [14, 'Último día. Hacé tu recorrido preferido de estas dos semanas.'],
      ],
    },
    en: {
      title: 'A 20-minute walk, phone away',
      description:
        'Twenty minutes of walking with your phone in your pocket. No headphones, no photos, no hurry. Around the block or wherever suits you: what matters is getting out and looking around.',
      days: [
        [1, 'Head out with no destination. Ten minutes out, ten minutes back.'],
        [4, 'Today, look for three things you had never noticed on your route.'],
        [7, 'One week. Change direction: go the other way.'],
        [11, 'Walk a little slower than comes naturally.'],
        [14, 'Last day. Take your favorite route of these two weeks.'],
      ],
    },
  },
  {
    slug: 'three-lines',
    order: 3,
    category: 'writing',
    duration_days: 21,
    timer_seconds: null,
    light: 'vishuddha',
    es: {
      title: 'Tres líneas antes de dormir',
      description:
        'Cada noche, tres líneas a mano o en la nota del día: algo que pasó, algo que sentiste, algo que agradecés. No tiene que estar bien escrito. Tiene que ser cierto.',
      days: [
        [1, 'Empezá por lo más chico que te acuerdes de hoy.'],
        [5, 'Hoy escribí sobre alguien que te hizo bien, aunque sea un minuto.'],
        [10, 'Mitad de camino. Una línea sobre algo que hoy te costó.'],
        [15, 'Escribí algo que hiciste hoy y que hace un mes no hacías.'],
        [21, 'Último día. Releé la primera noche y escribí qué cambió.'],
      ],
    },
    en: {
      title: 'Three lines before bed',
      description:
        'Each night, three lines by hand or in the day’s note: something that happened, something you felt, something you’re thankful for. It doesn’t need to be well written. It needs to be true.',
      days: [
        [1, 'Start with the smallest thing you remember from today.'],
        [5, 'Today, write about someone who did you good, even for a minute.'],
        [10, 'Halfway. One line about something that was hard today.'],
        [15, 'Write about something you did today that you weren’t doing a month ago.'],
        [21, 'Last day. Read your first night again and write what has changed.'],
      ],
    },
  },
  {
    slug: 'screens-off',
    order: 4,
    category: 'rest',
    duration_days: 7,
    timer_seconds: null,
    light: 'ajna',
    es: {
      title: 'Una hora sin pantallas antes de dormir',
      description:
        'Siete noches. Una hora antes de acostarte, dejá el teléfono cargando lejos de la cama y apagá las pantallas. Lo que hagas con esa hora es tuyo: leer, ordenar, charlar, mirar el techo.',
      days: [
        [1, 'Elegí dónde va a dormir tu teléfono esta semana. Que no sea al lado de la cama.'],
        [2, 'Prepará algo para esa hora: un libro, un té, una ducha.'],
        [4, 'Mitad de semana. Notá a qué hora te da sueño sin pantalla.'],
        [7, 'Última noche. Decidí qué parte de esto te querés quedar.'],
      ],
    },
    en: {
      title: 'One screen-free hour before sleep',
      description:
        'Seven nights. An hour before bed, leave your phone charging away from the bed and switch the screens off. What you do with that hour is yours: read, tidy up, talk, stare at the ceiling.',
      days: [
        [1, 'Choose where your phone sleeps this week. Not next to the bed.'],
        [2, 'Set something up for that hour: a book, a tea, a shower.'],
        [4, 'Midweek. Notice what time you get sleepy without a screen.'],
        [7, 'Last night. Decide which part of this you want to keep.'],
      ],
    },
  },
  {
    slug: 'seven-centers',
    order: 6,
    category: 'chakras',
    duration_days: 7,
    timer_seconds: 300,
    light: 'manipura',
    es: {
      title: 'Siete días, siete centros',
      description:
        'Una semana para recorrer los siete centros, de la raíz a la corona. Cada día, cinco minutos de respirar llevando la atención a una zona del cuerpo, y una pregunta para quedarte pensando.',
      days: [
        [1, 'Raíz. Atención en la base de la columna y en los pies. ¿Qué te hace sentir suelo firme?'],
        [2, 'Sacro. Atención debajo del ombligo. ¿Qué disfrutaste esta semana?'],
        [3, 'Plexo solar. Atención en la boca del estómago. ¿Qué decisión estás lista o listo para tomar?'],
        [4, 'Corazón. Atención en el centro del pecho. ¿A quién querés tener más cerca?'],
        [5, 'Garganta. Atención en el cuello. ¿Qué te falta decir?'],
        [6, 'Tercer ojo. Atención entre las cejas. ¿Qué ves más claro hoy que hace un mes?'],
        [7, 'Corona. Atención en la coronilla. Cinco minutos de silencio, sin pregunta.'],
      ],
    },
    en: {
      title: 'Seven days, seven centers',
      description:
        'A week to move through the seven centers, from root to crown. Each day, five minutes of breathing with your attention on one part of the body, and a question to carry with you.',
      days: [
        [1, 'Root. Attention on the base of the spine and your feet. What makes you feel solid ground?'],
        [2, 'Sacral. Attention below the navel. What did you enjoy this week?'],
        [3, 'Solar plexus. Attention on the pit of the stomach. What decision are you ready to make?'],
        [4, 'Heart. Attention on the center of the chest. Who do you want closer?'],
        [5, 'Throat. Attention on the neck. What is left for you to say?'],
        [6, 'Third eye. Attention between the eyebrows. What do you see more clearly today than a month ago?'],
        [7, 'Crown. Attention on the top of the head. Five minutes of silence, with no question.'],
      ],
    },
  },
  {
    slug: 'phone-free-morning',
    order: 7,
    category: 'habits',
    duration_days: 14,
    timer_seconds: null,
    light: 'manipura',
    en: {
      title: 'The first half hour without your phone',
      description:
        'For two weeks, the first thirty minutes of your day belong to you. No messages, no news, no feed. Get up, wash, look outside, do whatever your morning needs, and only then pick up the phone.',
      days: [
        [1, 'Tonight, charge your phone somewhere you have to walk to.'],
        [3, 'Notice the pull to check. Name it, and carry on with your morning.'],
        [7, 'One week. What have you done with those thirty minutes?'],
        [10, 'Try stretching it to forty-five minutes today.'],
        [14, 'Last day. Decide how you want your mornings to begin from now on.'],
      ],
    },
  },
  {
    slug: 'box-breathing',
    order: 8,
    category: 'breath',
    duration_days: 7,
    timer_seconds: 180,
    light: 'vishuddha',
    en: {
      title: 'Box breathing: four counts, three minutes',
      description:
        'In for four, hold for four, out for four, hold for four. Three minutes a day for a week. Count at whatever pace is comfortable, and if holding feels like too much, shorten the count.',
      days: [
        [1, 'Learn the shape today: in, hold, out, hold. Four counts each.'],
        [3, 'Try it somewhere ordinary: at your desk, on a bench, in a queue.'],
        [5, 'Let the counts slow down a little, without forcing them.'],
        [7, 'Last day. Do it once with your eyes open, looking at one thing.'],
      ],
    },
  },
  {
    slug: 'morning-stretch',
    order: 9,
    category: 'movement',
    duration_days: 21,
    timer_seconds: 300,
    light: 'svadhisthana',
    en: {
      title: 'A five-minute stretch when you wake up',
      description:
        'Before the day starts, five minutes of moving slowly: neck, shoulders, back, hips, legs. No routine to learn and nothing to achieve. Go gently, and stop short of anything that hurts.',
      days: [
        [1, 'Start standing. Reach up, then fold forward and let your arms hang.'],
        [5, 'Today, give the whole five minutes to your neck and shoulders.'],
        [10, 'Add your hips: slow circles, one way and then the other.'],
        [15, 'Move with your breath: reach on the in-breath, release on the out-breath.'],
        [21, 'Last day. Do the stretches your body asked for most these three weeks.'],
      ],
    },
  },
  {
    slug: 'morning-pages',
    order: 10,
    category: 'writing',
    level: 'deepening',
    duration_days: 30,
    timer_seconds: 600,
    light: 'ajna',
    en: {
      title: 'Morning pages: ten minutes without stopping',
      description:
        'Ten minutes of writing by hand, first thing, without lifting the pen. Whatever is in your head goes on the page: plans, complaints, dreams, lists. Nobody reads it, including you, unless you want to.',
      days: [
        [1, 'If nothing comes, write “nothing comes” until something does.'],
        [7, 'One week. Keep the pen moving, even through the dull parts.'],
        [14, 'Today, begin with “What I really want is…”.'],
        [21, 'Three weeks. Notice what keeps coming back onto the page.'],
        [30, 'Last day. Write about what these pages have been for you.'],
      ],
    },
  },
  {
    slug: 'tidy-corner',
    order: 11,
    category: 'habits',
    duration_days: 14,
    timer_seconds: 600,
    light: 'muladhara',
    en: {
      title: 'Ten minutes tidying one corner',
      description:
        'Pick one small place each day, a drawer, a shelf, the chair where things pile up, and give it ten minutes. When the timer ends, you stop, finished or not. Two weeks of corners add up.',
      days: [
        [1, 'Start with the surface you see first when you walk in.'],
        [4, 'Today: one drawer. Only one.'],
        [8, 'Choose the corner you have been avoiding.'],
        [11, 'Let go of three things you no longer use.'],
        [14, 'Last day. Walk through your place and look at what changed.'],
      ],
    },
  },
  {
    slug: 'sky',
    order: 12,
    category: 'meditation',
    duration_days: 7,
    timer_seconds: 120,
    light: 'sahasrara',
    en: {
      title: 'Two minutes looking at the sky',
      description:
        'Once a day, step outside or go to a window and look up for two minutes. Clouds, color, light, whatever is there. Nothing to do but look.',
      days: [
        [1, 'Find your spot: a door, a balcony, a window that shows some sky.'],
        [3, 'Today, look at a different time of day than yesterday.'],
        [5, 'Follow one thing as it moves: a cloud, a bird, the light.'],
        [7, 'Last day. Look for the farthest thing you can see.'],
      ],
    },
  },
  {
    slug: 'loving-kindness',
    order: 13,
    category: 'contemplation',
    level: 'deepening',
    duration_days: 14,
    timer_seconds: 600,
    light: 'anahata',
    en: {
      title: 'Ten minutes of wishing well',
      description:
        'A practice found, in one form or another, in many traditions: sit quietly and wish someone well, in your own words. Start with yourself, then widen the circle a little each day. Simple phrases are enough: may you be at ease, may you be safe, may your day be kind.',
      days: [
        [1, 'Begin with yourself. Wish yourself well, slowly, as you would a friend.'],
        [3, 'Someone who has been good to you. Picture them and wish them well.'],
        [5, 'Someone you love without effort.'],
        [8, 'Someone you barely know: a neighbor, a face from your street.'],
        [11, 'Someone you find difficult. Only as far as feels honest today.'],
        [14, 'Last day. Everyone you thought of these two weeks, and then everyone.'],
      ],
    },
  },
  {
    slug: 'mantra',
    order: 14,
    category: 'mantra',
    level: 'deepening',
    duration_days: 21,
    timer_seconds: 600,
    light: 'vishuddha',
    en: {
      title: 'One phrase, repeated: ten minutes of mantra',
      description:
        'Choose a word or a short phrase that means something to you: from a tradition you love, from a prayer you grew up with, or in your own words. Repeat it for ten minutes, aloud or silently, and each time you drift, come back to it. Keep the same one for the twenty-one days.',
      days: [
        [1, 'Choose your phrase today, and stay with it. It does not have to be perfect.'],
        [4, 'Say it aloud today, quietly, and listen to the sound.'],
        [8, 'Today, repeat it in silence, in time with your breath.'],
        [12, 'Carry it out of the sitting: once on waking, once before sleep.'],
        [17, 'Let the repetition slow down until there is space between the words.'],
        [21, 'Last day. After the ten minutes, sit a little in the quiet that follows.'],
      ],
    },
  },
  {
    slug: 'alternate-nostril',
    order: 15,
    category: 'breath',
    level: 'deepening',
    duration_days: 14,
    timer_seconds: 300,
    light: 'ajna',
    en: {
      title: 'Alternate-nostril breathing, five minutes',
      description:
        'An old yogic breathing practice. Close the right nostril with your thumb and breathe in through the left; close the left with your ring finger and breathe out through the right; in through the right, out through the left. That is one round. Breathe softly, without holding, and if you feel dizzy, stop and breathe normally.',
      days: [
        [1, 'Learn the pattern slowly. Getting lost and starting again is part of it.'],
        [4, 'Make the in-breath and the out-breath the same length.'],
        [7, 'One week. Let the breath grow quieter, almost without sound.'],
        [10, 'Let the out-breath run a little longer than the in-breath.'],
        [14, 'Last day. When the timer ends, sit for a minute breathing naturally.'],
      ],
    },
  },
  {
    slug: 'twenty-stillness',
    order: 16,
    category: 'meditation',
    level: 'deepening',
    duration_days: 21,
    timer_seconds: 1200,
    light: 'sahasrara',
    en: {
      title: '20 minutes of stillness',
      description:
        'Twenty minutes of sitting, every day for three weeks. Long enough to get restless, bored and quiet, sometimes all in one sitting. Use whatever anchor is yours: the breath, a sound, a word, or just sitting.',
      days: [
        [1, 'Settle your seat first. Twenty minutes is easier when the body is steady.'],
        [5, 'When restlessness comes, feel where it lives in the body before you move.'],
        [10, 'Halfway. Notice the moment just before a thought carries you off.'],
        [15, 'Today, drop the anchor for the last five minutes and simply sit.'],
        [21, 'Last day. Ask yourself what you want your daily sitting to be from here.'],
      ],
    },
  },
  {
    slug: 'self-inquiry',
    order: 17,
    category: 'contemplation',
    level: 'deepening',
    duration_days: 21,
    timer_seconds: 600,
    light: 'ajna',
    en: {
      title: 'One question, ten minutes',
      description:
        'Each day, sit with one question for ten minutes. Not to answer it: to keep asking and see what comes up underneath the first answer. On the days with no question given, return to the last one, or bring your own.',
      days: [
        [1, 'What do I actually want?'],
        [4, 'What am I pretending not to know?'],
        [7, 'What would I do if I were not afraid?'],
        [10, 'Who am I when nobody needs anything from me?'],
        [13, 'What am I holding on to that is already over?'],
        [16, 'Where in my life am I already free?'],
        [19, 'What is asking for my attention right now?'],
        [21, 'Last day. Which of these questions is still alive for you? Stay with that one.'],
      ],
    },
  },
  {
    slug: 'hour-of-silence',
    order: 18,
    category: 'meditation',
    level: 'committed',
    duration_days: 21,
    timer_seconds: 3600,
    light: 'vishuddha',
    en: {
      title: 'An hour of silence a day',
      description:
        'One hour each day without speaking, without a screen, without music or reading. You can sit, walk, cook or look out of a window: the practice is the silence, not the posture. Tell the people you live with, so the hour is protected.',
      days: [
        [1, 'Choose your hour and tell whoever needs to know.'],
        [4, 'Notice what you reach for when there is nothing to fill the quiet.'],
        [8, 'Spend part of today’s hour outdoors, if you can.'],
        [12, 'Listen to the silence itself, under the sounds.'],
        [17, 'Do one ordinary task in today’s hour, at half its usual speed.'],
        [21, 'Last day. Decide how much silence you want to keep in your days.'],
      ],
    },
  },
  {
    slug: 'forty-days',
    order: 19,
    category: 'meditation',
    level: 'committed',
    missed_rule: 'strict',
    duration_days: 40,
    timer_seconds: 1800,
    light: 'sahasrara',
    en: {
      title: 'Forty days, unbroken',
      description:
        'Many traditions keep a practice for forty days in a row to let it take root. Choose your own: sitting, prayer, mantra, breath, movement. Thirty minutes, every day, the same practice. Miss a day and you begin again from day one. That is the agreement, and it is kinder than it sounds.',
      days: [
        [1, 'Name your practice and the time of day. Write both in today’s note.'],
        [7, 'One week. The novelty is gone; this is where the practice starts.'],
        [14, 'Notice the stories about why today is the exception. Then practice.'],
        [21, 'Halfway and a little more. What is different from day one?'],
        [28, 'Four weeks. Let the practice be plain today, with nothing to get from it.'],
        [35, 'Five days left. Do not hurry toward the end.'],
        [40, 'Forty days. Sit a while after the timer, and thank whatever brought you here.'],
      ],
    },
  },
  {
    slug: 'one-song',
    order: 20,
    category: 'meditation',
    duration_days: 7,
    timer_seconds: null,
    light: 'vishuddha',
    en: {
      title: 'One song, eyes closed',
      description:
        'Once a day, listen to one piece of music from beginning to end with your eyes closed, doing nothing else. No scrolling, no chores, no skipping ahead. A way into stillness for people who find silence hard.',
      days: [
        [1, 'Pick a song you know well. Hear it as if for the first time.'],
        [3, 'Follow one instrument or one voice all the way through.'],
        [5, 'Choose something without words today.'],
        [7, 'Last day. When the song ends, stay for a minute in the quiet after it.'],
      ],
    },
  },
  {
    slug: 'rest-eyes',
    order: 21,
    category: 'rest',
    duration_days: 14,
    timer_seconds: 300,
    light: 'ajna',
    en: {
      title: 'Five minutes lying down, eyes closed',
      description:
        'Somewhere in the middle of your day, lie down for five minutes and close your eyes. Not to sleep, not to think anything through: only to stop. Put the phone out of reach and let the timer bring you back.',
      days: [
        [1, 'Find your place: a bed, a sofa, a mat on the floor.'],
        [4, 'Let your jaw, your shoulders and your hands go heavy, in that order.'],
        [8, 'Notice the sounds around you without naming them.'],
        [11, 'Before you get up, take three slow breaths.'],
        [14, 'Last day. Notice what time of day you needed this most.'],
      ],
    },
  },
  {
    slug: 'one-thing-well',
    order: 22,
    category: 'writing',
    duration_days: 14,
    timer_seconds: null,
    light: 'manipura',
    en: {
      title: 'One thing I did well today',
      description:
        'Each night, write one line in the day’s note: something you did well today. Small counts. Showing up counts. The practice is learning to see it.',
      days: [
        [1, 'Start small. One true line.'],
        [4, 'Today, something you did well for someone else.'],
        [8, 'Something you did well that nobody noticed.'],
        [11, 'Something you did well on a day that went badly.'],
        [14, 'Last day. Read your lines back, slowly.'],
      ],
    },
  },
];

/**
 * Paths: team challenges in an order that makes sense to do them in. Nothing
 * is locked: a path only tells the person where they are and what comes next.
 * A path exists in a language only when every step does.
 */
const PATHS: { id: string; name: Record<'es' | 'en', string>; steps: string[] }[] = [
  {
    id: 'breath',
    name: { es: 'Respiración', en: 'Breath' },
    steps: ['box-breathing', 'breathing', 'alternate-nostril'],
  },
  {
    id: 'stillness',
    name: { es: 'Quietud', en: 'Stillness' },
    steps: ['one-song', 'sky', 'stillness', 'twenty-stillness', 'hour-of-silence', 'forty-days'],
  },
  {
    id: 'looking-inward',
    name: { es: 'Mirar hacia adentro', en: 'Looking inward' },
    steps: ['loving-kindness', 'mantra', 'self-inquiry'],
  },
  {
    id: 'the-page',
    name: { es: 'La página', en: 'The page' },
    steps: ['one-thing-well', 'three-lines', 'morning-pages'],
  },
  {
    id: 'unplugged',
    name: { es: 'Sin pantallas', en: 'Unplugged' },
    steps: ['screens-off', 'phone-free-morning', 'rest-eyes', 'walk'],
  },
];

/** Where a team challenge sits on its path, as stored on its row; all null when it is on none. */
function pathFields(slug: string, locale: 'es' | 'en'): Item {
  const written = (step: string) => Boolean(TEAM.find((entry) => entry.slug === step)?.[locale]);
  const path = PATHS.find((candidate) => candidate.steps.includes(slug) && candidate.steps.every(written));
  if (!path) return { path_id: null, path_name: null, path_step: null, path_total: null, next_id: null };
  const index = path.steps.indexOf(slug);
  const next = path.steps[index + 1];
  return {
    path_id: path.id,
    path_name: path.name[locale],
    path_step: index + 1,
    path_total: path.steps.length,
    next_id: next ? `official-${next}-${locale}` : null,
  };
}

export async function seed(): Promise<{ created: number; challenges: number }> {
  let created = 0;
  let challenges = 0;
  for (const entry of TEAM) {
    for (const locale of ['es', 'en'] as const) {
      const copy = entry[locale];
      if (!copy) continue;
      challenges++;
      const id = `official-${entry.slug}-${locale}`;
      const challenge: Item = {
        pk: `CH#${id}`,
        sk: 'A',
        id,
        creator_id: null,
        is_official: true,
        title: copy.title,
        description: copy.description,
        duration_days: entry.duration_days,
        locale,
        missed_rule: entry.missed_rule ?? 'calendar',
        category: entry.category,
        level: entry.level ?? 'beginning',
        light: entry.light,
        timer_seconds: entry.timer_seconds,
        audio_path: null,
        link_url: null,
        up_count: 0,
        down_count: 0,
        rank: 0,
        member_count: 0,
        comment_count: 0,
        hidden_at: null,
        // A second apart, so they always list in their order.
        created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, entry.order)).toISOString(),
      };
      try {
        await put(challenge, true);
        created++;
      } catch (error) {
        if ((error as Error).name !== 'ConditionalCheckFailedException') throw error;
        // Seeded before categories or levels existed: give it them, and touch nothing else.
        for (const [name, value] of [['category', challenge.category], ['level', challenge.level]]) {
          await update(challenge.pk, 'A', {
            set: { [name]: value },
            condition: 'attribute_not_exists(#missing)',
            names: { '#missing': name },
          });
        }
      }
      // Paths can be rearranged between runs; where a challenge sits is the team's to say.
      await update(challenge.pk, 'A', { set: pathFields(entry.slug, locale) });
      await batchWrite([
        { pk: `CHLO#${locale}`, sk: id },
        ...copy.days.map(([day, body]) => ({
          pk: `CH#${id}`,
          sk: `DAY#${String(day).padStart(3, '0')}`,
          challenge_id: id,
          day_number: day,
          body,
          timer_seconds: null,
          audio_path: null,
          link_url: null,
        })),
      ]);
    }
  }
  await batchWrite(
    [],
    RETIRED.flatMap((slug) => ['es', 'en'].map((locale) => ({ pk: `CHLO#${locale}`, sk: `official-${slug}-${locale}` })))
  );
  return { created, challenges };
}
