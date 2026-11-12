import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ChakraId } from '@/data/chakras';
import { useMe } from '@/lib/auth';
import { localDate, progress, type Progress } from '@/lib/days';
import {
  AUTHOR_FIELDS,
  type Challenge,
  type ChallengeDay,
  type Checkin,
  type Comment,
  type Membership,
  type MissedRule,
} from '@/lib/db.types';
import { locale, type Locale } from '@/lib/i18n';
import { newId, uploadFile } from '@/lib/media';
import { supabase } from '@/lib/supabase';

const CHALLENGE = `*, creator:profiles(${AUTHOR_FIELDS})`;

// ── reading ──────────────────────────────────────────────────────────

export type ChallengeSort = 'top' | 'new';

/** Community challenges. "top" follows the vote rank, then how many joined. */
export function useChallenges(sort: ChallengeSort, language: Locale | 'all') {
  return useQuery({
    queryKey: ['challenges', sort, language],
    queryFn: async () => {
      let query = supabase.from('challenges').select(CHALLENGE).eq('is_official', false);
      if (language !== 'all') query = query.eq('locale', language);
      if (sort === 'top') {
        query = query.order('rank', { ascending: false }).order('member_count', { ascending: false });
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(60);
      if (error) throw error;
      return data as Challenge[];
    },
  });
}

/** The ones suggested by the app, in the phone's language. */
export function useSuggestedChallenges() {
  return useQuery({
    queryKey: ['challenges', 'suggested', locale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_official', true)
        .eq('locale', locale)
        .order('created_at');
      if (error) throw error;
      return data as Challenge[];
    },
  });
}

export function useChallenge(id: string | undefined) {
  return useQuery({
    queryKey: ['challenge', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('challenges').select(CHALLENGE).eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as Challenge | null;
    },
  });
}

export function useChallengeDays(id: string | undefined) {
  return useQuery({
    queryKey: ['challenge-days', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_days')
        .select('*')
        .eq('challenge_id', id!)
        .order('day_number');
      if (error) throw error;
      return data as ChallengeDay[];
    },
  });
}

export type Joined = Membership & { challenge: Challenge };

/** The challenges the signed-in person has joined. */
export function useMemberships() {
  const me = useMe();
  return useQuery({
    queryKey: ['memberships', me],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_members')
        .select('*, challenge:challenges(*)')
        .eq('user_id', me)
        .order('joined_at', { ascending: false });
      if (error) throw error;
      return (data as Joined[]).filter((row) => row.challenge);
    },
  });
}

/** Every day the signed-in person has ticked, across all their challenges. */
export function useMyCheckins() {
  const me = useMe();
  return useQuery({
    queryKey: ['checkins', me],
    queryFn: async () => {
      const { data, error } = await supabase.from('checkins').select('*').eq('user_id', me);
      if (error) throw error;
      return data as Checkin[];
    },
  });
}

/** Where the signed-in person stands in one challenge, or null if not joined. */
export function useMyProgress(challenge: Challenge | null | undefined): {
  membership: Joined | null;
  checkins: Checkin[];
  progress: Progress | null;
} {
  const memberships = useMemberships();
  const all = useMyCheckins();
  const membership = memberships.data?.find((m) => m.challenge_id === challenge?.id) ?? null;
  const checkins = (all.data ?? []).filter((c) => c.challenge_id === challenge?.id);
  return {
    membership,
    checkins,
    progress:
      challenge && membership
        ? progress(challenge.missed_rule, challenge.duration_days, membership.start_date, checkins)
        : null,
  };
}

/** Notes people chose to share on a challenge, newest first. */
export function useSharedNotes(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['notes', challengeId],
    enabled: Boolean(challengeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkins')
        .select(`*, author:profiles(${AUTHOR_FIELDS})`)
        .eq('challenge_id', challengeId!)
        .eq('note_public', true)
        .neq('note', '')
        .is('hidden_at', null)
        .order('done_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      return data as Checkin[];
    },
  });
}

export function useComments(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['comments', challengeId],
    enabled: Boolean(challengeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`*, author:profiles(${AUTHOR_FIELDS})`)
        .eq('challenge_id', challengeId!)
        .is('hidden_at', null)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Comment[];
    },
  });
}

/** The signed-in person's votes, as challenge id → +1 or −1. */
export function useMyVotes() {
  const me = useMe();
  return useQuery({
    queryKey: ['votes', me],
    queryFn: async () => {
      const { data, error } = await supabase.from('challenge_votes').select('challenge_id, value').eq('user_id', me);
      if (error) throw error;
      return Object.fromEntries(
        (data as { challenge_id: string; value: number }[]).map((v) => [v.challenge_id, v.value])
      ) as Record<string, number>;
    },
  });
}

// ── taking part ──────────────────────────────────────────────────────

export function useJoin() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from('challenge_members')
        .insert({ challenge_id: challengeId, user_id: me, start_date: localDate() });
      if (error) throw error;
    },
    onSettled: (_data, _error, challengeId) => {
      client.invalidateQueries({ queryKey: ['memberships', me] });
      client.invalidateQueries({ queryKey: ['challenge', challengeId] });
    },
  });
}

export function useLeave() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from('challenge_members')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', me);
      if (error) throw error;
    },
    onSettled: (_data, _error, challengeId) => {
      client.invalidateQueries({ queryKey: ['memberships', me] });
      client.invalidateQueries({ queryKey: ['checkins', me] });
      client.invalidateQueries({ queryKey: ['notes', challengeId] });
      client.invalidateQueries({ queryKey: ['challenge', challengeId] });
    },
  });
}

/** Clears the current attempt and makes today day 1 again. */
export function useRestart() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase.rpc('restart_challenge', {
        p_challenge: challengeId,
        p_start: localDate(),
      });
      if (error) throw error;
    },
    onSettled: (_data, _error, challengeId) => {
      client.invalidateQueries({ queryKey: ['memberships', me] });
      client.invalidateQueries({ queryKey: ['checkins', me] });
      client.invalidateQueries({ queryKey: ['notes', challengeId] });
    },
  });
}

export function useSetReminder() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, time }: { challengeId: string; time: string | null }) => {
      const { error } = await supabase
        .from('challenge_members')
        .update({ reminder_time: time })
        .eq('challenge_id', challengeId)
        .eq('user_id', me);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['memberships', me] }),
  });
}

export function useCheckIn() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { challengeId: string; day: number; note: string; notePublic: boolean }) => {
      const { error } = await supabase.from('checkins').insert({
        challenge_id: input.challengeId,
        user_id: me,
        day_number: input.day,
        local_date: localDate(),
        note: input.note,
        note_public: input.notePublic,
      });
      if (error) throw error;
    },
    // Ticking a day should feel instant, even on a slow connection.
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: ['checkins', me] });
      const before = client.getQueryData<Checkin[]>(['checkins', me]) ?? [];
      const optimistic: Checkin = {
        id: `pending-${input.day}`,
        challenge_id: input.challengeId,
        user_id: me,
        day_number: input.day,
        local_date: localDate(),
        note: input.note,
        note_public: input.notePublic,
        hidden_at: null,
        done_at: new Date().toISOString(),
      };
      client.setQueryData(['checkins', me], [...before, optimistic]);
      return { before };
    },
    onError: (_error, _input, context) => client.setQueryData(['checkins', me], context?.before),
    onSettled: (_data, _error, input) => {
      client.invalidateQueries({ queryKey: ['checkins', me] });
      client.invalidateQueries({ queryKey: ['notes', input.challengeId] });
    },
  });
}

export function useUpdateNote() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { challengeId: string; day: number; note: string; notePublic: boolean }) => {
      const { error } = await supabase
        .from('checkins')
        .update({ note: input.note, note_public: input.notePublic })
        .eq('challenge_id', input.challengeId)
        .eq('user_id', me)
        .eq('day_number', input.day);
      if (error) throw error;
    },
    onSettled: (_data, _error, input) => {
      client.invalidateQueries({ queryKey: ['checkins', me] });
      client.invalidateQueries({ queryKey: ['notes', input.challengeId] });
    },
  });
}

export function useUndoCheckIn() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, day }: { challengeId: string; day: number }) => {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', me)
        .eq('day_number', day);
      if (error) throw error;
    },
    onSettled: (_data, _error, { challengeId }) => {
      client.invalidateQueries({ queryKey: ['checkins', me] });
      client.invalidateQueries({ queryKey: ['notes', challengeId] });
    },
  });
}

/** `value` is +1, −1, or 0 to take the vote back. */
export function useVote() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, value }: { challengeId: string; value: number }) => {
      const votes = supabase.from('challenge_votes');
      const { error } =
        value === 0
          ? await votes.delete().eq('challenge_id', challengeId).eq('user_id', me)
          : await votes.upsert({ challenge_id: challengeId, user_id: me, value });
      if (error) throw error;
    },
    onMutate: async ({ challengeId, value }) => {
      await client.cancelQueries({ queryKey: ['votes', me] });
      const before = client.getQueryData<Record<string, number>>(['votes', me]) ?? {};
      const previous = before[challengeId] ?? 0;
      const next = { ...before };
      if (value === 0) delete next[challengeId];
      else next[challengeId] = value;
      client.setQueryData(['votes', me], next);

      const challenge = client.getQueryData<Challenge | null>(['challenge', challengeId]);
      if (challenge) {
        client.setQueryData(['challenge', challengeId], {
          ...challenge,
          up_count: challenge.up_count + (value === 1 ? 1 : 0) - (previous === 1 ? 1 : 0),
          down_count: challenge.down_count + (value === -1 ? 1 : 0) - (previous === -1 ? 1 : 0),
        });
      }
      return { before, challenge };
    },
    onError: (_error, { challengeId }, context) => {
      client.setQueryData(['votes', me], context?.before);
      if (context?.challenge) client.setQueryData(['challenge', challengeId], context.challenge);
    },
    onSettled: (_data, _error, { challengeId }) => {
      client.invalidateQueries({ queryKey: ['votes', me] });
      client.invalidateQueries({ queryKey: ['challenge', challengeId] });
      client.invalidateQueries({ queryKey: ['challenges'] });
    },
  });
}

export function useAddComment() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, body }: { challengeId: string; body: string }) => {
      const { error } = await supabase
        .from('comments')
        .insert({ challenge_id: challengeId, user_id: me, body });
      if (error) throw error;
    },
    onSettled: (_data, _error, { challengeId }) => {
      client.invalidateQueries({ queryKey: ['comments', challengeId] });
      client.invalidateQueries({ queryKey: ['challenge', challengeId] });
    },
  });
}

export function useDeleteComment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (comment: Comment) => {
      const { error } = await supabase.from('comments').delete().eq('id', comment.id);
      if (error) throw error;
    },
    onSettled: (_data, _error, comment) => {
      client.invalidateQueries({ queryKey: ['comments', comment.challenge_id] });
      client.invalidateQueries({ queryKey: ['challenge', comment.challenge_id] });
    },
  });
}

// ── creating ─────────────────────────────────────────────────────────

export type PickedAudio = { uri: string; name: string; mimeType: string };

export type NewChallenge = {
  title: string;
  description: string;
  duration_days: number;
  locale: Locale;
  missed_rule: MissedRule;
  light: ChakraId;
  timer_seconds: number | null;
  link_url: string | null;
  audio: PickedAudio | null;
  /** Text for individual days; days left out simply have none. */
  days: { day_number: number; body: string }[];
};

/** Creates the challenge and joins its creator, so day 1 starts today. */
export function useCreateChallenge() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ audio, days, ...fields }: NewChallenge) => {
      let audio_path: string | null = null;
      if (audio) {
        const extension = /\.([a-z0-9]{2,4})$/i.exec(audio.name)?.[1]?.toLowerCase() ?? 'm4a';
        audio_path = `${me}/audio/${newId()}.${extension}`;
        await uploadFile(audio.uri, audio_path, audio.mimeType);
      }
      const { data, error } = await supabase
        .from('challenges')
        .insert({ creator_id: me, audio_path, ...fields })
        .select('id')
        .single();
      if (error) throw error;
      const id = (data as { id: string }).id;

      const texts = days.filter((day) => day.body.trim() !== '');
      if (texts.length) {
        const { error: daysError } = await supabase
          .from('challenge_days')
          .insert(texts.map((day) => ({ challenge_id: id, ...day })));
        if (daysError) throw daysError;
      }
      await supabase
        .from('challenge_members')
        .insert({ challenge_id: id, user_id: me, start_date: localDate() });
      return id;
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['challenges'] });
      client.invalidateQueries({ queryKey: ['memberships', me] });
    },
  });
}

export function useDeleteChallenge() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      // Row level security refuses this once other people have joined, and a
      // refused delete is not an error — it just removes nothing.
      const { data, error } = await supabase.from('challenges').delete().eq('id', challengeId).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('has-members');
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['challenges'] });
      client.invalidateQueries({ queryKey: ['memberships', me] });
    },
  });
}
