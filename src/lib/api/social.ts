import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth, useMe } from '@/lib/auth';
import { read, write } from '@/lib/aws';
import type { Profile, Report, ReportTarget } from '@/lib/db.types';
import { locale } from '@/lib/i18n';
import { uploadAvatar } from '@/lib/media';
import type { PickedPhoto } from '@/lib/photos';

// ── profiles ─────────────────────────────────────────────────────────

export function useProfileByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ['profile', 'by-username', username],
    enabled: Boolean(username),
    queryFn: () => read<Profile | null>('profileByUsername', { username }),
  });
}

/** Thrown when the chosen username already belongs to someone. */
export const USERNAME_TAKEN = 'username-taken';

/** Creates the profile; the backend creates the seven chakra boards with it. */
export function useCreateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; display_name: string }) =>
      write('createProfile', { locale, ...input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useUpdateProfile() {
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
      if (avatar) row.avatar_path = await uploadAvatar(avatar);
      await write('updateProfile', row);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
}

/** Removes the account and everything it owns: rows, files and the sign-in itself. */
export function useDeleteAccount() {
  const { signOut } = useAuth();
  return useMutation({
    mutationFn: async () => {
      await write('deleteAccount');
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
    queryFn: () => read<Blocked[]>('myBlocked'),
  });
}

/** Blocking changes what every list may show, so everything is refetched. */
export function useSetBlocked() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; blocked: boolean }) => write('setBlocked', input),
    onSettled: () => client.invalidateQueries(),
  });
}

// ── reporting and moderation ─────────────────────────────────────────

export function useReport() {
  return useMutation({
    mutationFn: (input: { type: ReportTarget; id: string; reason: string }) => write('report', input),
  });
}

/** Open reports, for admins. Everyone else gets an empty list from the backend. */
export function useOpenReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => read<Report[]>('openReports'),
  });
}

/** Takes something down for everyone at once. Admins only; the backend checks. */
export function useAdminHide() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { type: ReportTarget; id: string }) =>
      write('adminSetHidden', { ...input, hidden: true }),
    onSettled: () => client.invalidateQueries(),
  });
}

export function useResolveReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ report, hide }: { report: Report; hide: boolean }) => {
      const target = { type: report.target_type, id: report.target_id };
      return hide ? write('adminSetHidden', { ...target, hidden: true }) : write('adminDismissReports', target);
    },
    onSettled: () => client.invalidateQueries(),
  });
}
