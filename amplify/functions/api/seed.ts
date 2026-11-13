import { batchWrite, put, type Item } from './db';

/**
 * Starter content: the one challenge the app suggests, in both languages. The
 * texts are original to SevenLights. Running this again changes nothing that
 * people have done — the challenge row is only written if it is not there yet.
 */

const BREATHING: { locale: 'es' | 'en'; title: string; description: string; days: [number, string][] }[] = [
  {
    locale: 'es',
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
  {
    locale: 'en',
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
];

export async function seed(): Promise<{ created: number; challenges: number }> {
  let created = 0;
  for (const entry of BREATHING) {
    const id = `official-breathing-${entry.locale}`;
    const challenge: Item = {
      pk: `CH#${id}`,
      sk: 'A',
      id,
      creator_id: null,
      is_official: true,
      title: entry.title,
      description: entry.description,
      duration_days: 21,
      locale: entry.locale,
      missed_rule: 'calendar',
      light: 'anahata',
      timer_seconds: 300,
      audio_path: null,
      link_url: null,
      up_count: 0,
      down_count: 0,
      rank: 0,
      member_count: 0,
      comment_count: 0,
      hidden_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    try {
      await put(challenge, true);
      created++;
    } catch (error) {
      if ((error as Error).name !== 'ConditionalCheckFailedException') throw error;
    }
    await batchWrite([
      { pk: `CHLO#${entry.locale}`, sk: id },
      ...entry.days.map(([day, body]) => ({
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
  return { created, challenges: BREATHING.length };
}
