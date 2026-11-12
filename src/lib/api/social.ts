import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth, useMe } from '@/lib/auth';
import type { Profile, Report, ReportTarget } from '@/lib/db.types';
import { locale } from '@/lib/i18n';
import { newId, removeAllFilesOf, uploadImage } from '@/lib/media';
import type { PickedPhoto } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

// ── profiles ─────────────────────────────────────────────────────────

export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'by-username', username],
    enabled: Boolean(username),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('username', username!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/** Thrown when the chosen username already belongs to someone. */
export const USERNAME_TAKEN = 'username-taken';

const taken = (error: { code?: string }) => (error.code === '23505' ? new Error(USERNAME_TAKEN) : error);

export function useCreateProfile() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { username: string; display_name: string }) => {
      const { error } = await supabase.from('profiles').insert({ id: me, locale, ...input });
      if (error) throw taken(error);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useUpdateProfile() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      username?: string;
      display_name?: string;
      bio?: string;
      avatar?: PickedPhoto;
    }) => {
      const { avatar, ...patch } = input;
      const row: Record<string, string> = { ...patch };
      if (avatar) {
        row.avatar_path = `${me}/avatar/${newId()}.jpg`;
        await uploadImage(avatar, row.avatar_path);
      }
      const { error } = await supabase.from('profiles').update(row).eq('id', me);
      if (error) throw taken(error);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
}

/** Removes the person's files, then the account and everything it owns. */
export function useDeleteAccount() {
  const me = useMe();
  const { signOut } = useAuth();
  return useMutation({
    mutationFn: async () => {
      await removeAllFilesOf(me);
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await signOut();
    },
  });
}

// ── blocking ─────────────────────────────────────────────────────────

export type Blocked = Pick<Profile, 'id' | 'username' | 'display_name'>;

export function useBlocked() {
  const me = useMe();
  return useQuery({
    queryKey: ['blocked', me],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_blocked');
      if (error) throw error;
      return data as Blocked[];
    },
  });
}

/** Blocking changes what every list may show, so everything is refetched. */
export function useSetBlocked() {
  const me = useMe();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      const blocks = supabase.from('blocks');
      const { error } = blocked
        ? await blocks.upsert({ blocker_id: me, blocked_id: userId }, { ignoreDuplicates: true })
        : await blocks.delete().eq('blocker_id', me).eq('blocked_id', userId);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries(),
  });
}

// ── reporting and moderation ─────────────────────────────────────────

export function useReport() {
  const me = useMe();
  return useMutation({
    mutationFn: async (input: { type: ReportTarget; id: string; reason: string }) => {
      const { error } = await supabase.from('reports').upsert(
        { reporter_id: me, target_type: input.type, target_id: input.id, reason: input.reason },
        { onConflict: 'reporter_id,target_type,target_id', ignoreDuplicates: true }
      );
      if (error) throw error;
    },
  });
}

/** Open reports, for admins. Everyone else gets an empty list from the policy. */
export function useOpenReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
  });
}

export function useResolveReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ report, hide }: { report: Report; hide: boolean }) => {
      const { error } = hide
        ? await supabase.rpc('admin_set_hidden', {
            p_type: report.target_type,
            p_id: report.target_id,
            p_hidden: true,
          })
        : await supabase.rpc('admin_dismiss_reports', {
            p_type: report.target_type,
            p_id: report.target_id,
          });
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries(),
  });
}
