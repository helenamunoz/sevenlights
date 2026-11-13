import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ChakraId } from '@/data/chakras';
import { useMe } from '@/lib/auth';
import { localDate, progress, type Progress } from '@/lib/days';
import { read, write } from '@/lib/aws';
import {
  type Challenge,
  type ChallengeDay,
  type Checkin,
  type Comment,
  type Membership,
  type MissedRule,
} from '@/lib/db.types';
import { locale, type Locale } from '@/lib/i18n';
import { uploadAudio } from '@/lib/media';

// ── reading ──────────────────────────────────────────────────────────

export type ChallengeSort = 'top' | 'new';

/** Community challenges. "top" follows the vote rank, then how many joined. */
export function useChallenges(sort: ChallengeSort, language: Locale | 'all') {
  return useQuery({
    queryKey: ['challenges', sort, language],
    queryFn: () => read<Challenge[]>('challenges', { sort, language }),
  });
}

/** The ones suggested by the app, in the phone's language. */
export function useSuggestedChallenges() {
  return useQuery({
    queryKey: ['challenges', 'suggested', locale],
    queryFn: () => read<Challenge[]>('suggestedChallenges', { locale }),
  });
}

export function useChallenge(id: string | undefined) {
  return useQuery({
    queryKey: ['challenge', id],
    enabled: Boolean(id),
    queryFn: () => read<Challenge | null>('challenge', { id }),
  });
}

export function useChallengeDays(id: string | undefined) {
  return useQuery({
    queryKey: ['challenge-days', id],
    enabled: Boolean(id),
    queryFn: () => read<ChallengeDay[]>('challengeDays', { id }),
  });
}

export type Joined = Membership & { challenge: Challenge };

/** The challenges the signed-in person has joined. */
export function useMemberships() {
  const me = useMe();
  return useQuery({
    queryKey: ['memberships', me],
    queryFn: () => read<Joined[]>('myMemberships'),
  });
}

/** Every day the signed-in person has ticked, across all their challenges. */
export function useMyCheckins() {
  const me = useMe();
  return useQuery({
    queryKey: ['checkins', me],
    queryFn: () => read<Checkin[]>('myCheckins'),
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
    queryFn: () => read<Checkin[]>('sharedNotes', { challengeId }),
  });
}

export function useComments(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['comments', challengeId],
    enabled: Boolean(challengeId),
    // The backend also returns the caller's own comments an admin has hidden.
    queryFn: async () =>
      (await read<Comment[]>('comments', { challengeId })).filter((comment) => !comment.hidden_at),
  });
}

/** The signed-in person's votes, as challenge id → +1 or −1. */
export function useMyVotes() {
  const me = useMe();
  return useQuery({
    queryKey: ['votes', me],
    queryFn: () => read<Record<string, number>>('myVotes'),
  });
}

// ── taking part ──────────────────────────────────────────────────────

export function useJoin() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) => write('join', { challengeId, start_date: localDate() }),
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
    mutationFn: (challengeId: string) => write('leave', { challengeId }),
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
    mutationFn: (challengeId: string) => write('restart', { challengeId, start_date: localDate() }),
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
    mutationFn: (input: { challengeId: string; time: string | null }) => write('setReminder', input),
    onSettled: () => client.invalidateQueries({ queryKey: ['memberships', me] }),
  });
}

export function useCheckIn() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { challengeId: string; day: number; note: string; notePublic: boolean }) =>
      write('checkIn', { ...input, local_date: localDate() }),
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
    mutationFn: (input: { challengeId: string; day: number; note: string; notePublic: boolean }) =>
      write('updateNote', input),
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
    mutationFn: (input: { challengeId: string; day: number }) => write('undoCheckIn', input),
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
    mutationFn: (input: { challengeId: string; value: number }) => write('vote', input),
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
    mutationFn: (input: { challengeId: string; body: string }) => write('addComment', input),
    onSettled: (_data, _error, { challengeId }) => {
      client.invalidateQueries({ queryKey: ['comments', challengeId] });
      client.invalidateQueries({ queryKey: ['challenge', challengeId] });
    },
  });
}

export function useDeleteComment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (comment: Comment) => write('deleteComment', { id: comment.id }),
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
    mutationFn: async ({ audio, ...fields }: NewChallenge) => {
      const audio_path = audio ? await uploadAudio(audio.uri, audio.name, audio.mimeType) : null;
      return write<string>('createChallenge', { ...fields, audio_path, start_date: localDate() });
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
    // Refused with "has-members" once other people have joined.
    mutationFn: (challengeId: string) => write('deleteChallenge', { id: challengeId }),
    onSettled: () => {
      client.invalidateQueries({ queryKey: ['challenges'] });
      client.invalidateQueries({ queryKey: ['memberships', me] });
    },
  });
}
