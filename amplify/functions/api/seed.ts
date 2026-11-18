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
];

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
        missed_rule: 'calendar',
        category: entry.category,
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
        // Seeded before categories existed: give it one, and touch nothing else.
        await update(challenge.pk, 'A', {
          set: { category: entry.category },
          condition: 'attribute_not_exists(#category)',
          names: { '#category': 'category' },
        });
      }
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
