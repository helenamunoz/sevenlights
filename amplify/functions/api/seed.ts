import { batchWrite, put, update, type Item } from './db';

/**
 * Starter content: the challenges signed by the 7Lights team, one per kind of
 * practice, each in both languages. The texts are original to 7Lights.
 * Running this again changes nothing that people have done — a challenge row
 * is only written if it is not there yet.
 */

type Copy = { title: string; description: string; days: [number, string][] };

type TeamChallenge = {
  slug: string;
  category: string;
  duration_days: number;
  timer_seconds: number | null;
  light: string;
  es: Copy;
  en: Copy;
};

/** In the order the app lists them. */
const TEAM: TeamChallenge[] = [
  {
    slug: 'breathing',
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
    slug: 'water',
    category: 'habits',
    duration_days: 14,
    timer_seconds: null,
    light: 'svadhisthana',
    es: {
      title: 'Un vaso de agua al despertar',
      description:
        'Antes del mate, del café y del teléfono: un vaso de agua. Es un gesto mínimo para empezar el día eligiendo algo vos. Dejá el vaso listo la noche anterior.',
      days: [
        [1, 'Esta noche dejá el vaso servido donde lo veas al levantarte.'],
        [5, 'Tomalo despacio, de pie, sin hacer otra cosa.'],
        [9, 'Sumale diez segundos: mirá por la ventana mientras tomás.'],
        [14, 'Último día. ¿Qué otro gesto chico querés sumar a tu mañana?'],
      ],
    },
    en: {
      title: 'A glass of water when you wake up',
      description:
        'Before coffee, before your phone: a glass of water. It’s a tiny way to start the day by choosing something yourself. Leave the glass ready the night before.',
      days: [
        [1, 'Tonight, leave the glass poured where you’ll see it when you get up.'],
        [5, 'Drink it slowly, standing, doing nothing else.'],
        [9, 'Add ten seconds: look out the window while you drink.'],
        [14, 'Last day. What other small gesture would you add to your morning?'],
      ],
    },
  },
  {
    slug: 'seven-centers',
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
];

export async function seed(): Promise<{ created: number; challenges: number }> {
  let created = 0;
  for (const [index, entry] of TEAM.entries()) {
    for (const locale of ['es', 'en'] as const) {
      const copy = entry[locale];
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
        // A second apart, so they always list in the order above.
        created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
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
  return { created, challenges: TEAM.length * 2 };
}
