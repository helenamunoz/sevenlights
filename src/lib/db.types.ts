import type { ChakraId } from '@/data/chakras';
import type { Locale } from '@/lib/i18n';

/** Row shapes, mirroring supabase/schema.sql. */

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_path: string | null;
  locale: Locale;
  created_at: string;
};

/** The few profile fields shown next to someone's content. */
export type Author = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_path'>;

export type BoardImage = {
  id: string;
  board_id: string;
  owner_id: string;
  storage_path: string;
  caption: string;
  position: number;
  source_image_id: string | null;
  source_owner_id: string | null;
  created_at: string;
};

export type Board = {
  id: string;
  owner_id: string;
  chakra: ChakraId | null;
  title: string;
  light: ChakraId;
  intention: string;
  affirmation: string;
  words: string[];
  is_public: boolean;
  hidden_at: string | null;
  like_count: number;
  image_count: number;
  created_at: string;
  updated_at: string;
  images: BoardImage[];
  owner?: Author | null;
};

export type MissedRule = 'calendar' | 'any_pace' | 'strict';

export type Challenge = {
  id: string;
  creator_id: string | null;
  is_official: boolean;
  title: string;
  description: string;
  duration_days: number;
  locale: Locale;
  missed_rule: MissedRule;
  light: ChakraId;
  timer_seconds: number | null;
  audio_path: string | null;
  link_url: string | null;
  up_count: number;
  down_count: number;
  rank: number;
  member_count: number;
  comment_count: number;
  hidden_at: string | null;
  created_at: string;
  creator?: Author | null;
};

export type ChallengeDay = {
  challenge_id: string;
  day_number: number;
  body: string;
  timer_seconds: number | null;
  audio_path: string | null;
  link_url: string | null;
};

export type Membership = {
  challenge_id: string;
  user_id: string;
  start_date: string;
  reminder_time: string | null;
  restarts: number;
  joined_at: string;
};

export type Checkin = {
  id: string;
  challenge_id: string;
  user_id: string;
  day_number: number;
  local_date: string;
  note: string;
  note_public: boolean;
  hidden_at: string | null;
  done_at: string;
  author?: Author | null;
};

export type Comment = {
  id: string;
  challenge_id: string;
  user_id: string;
  body: string;
  hidden_at: string | null;
  created_at: string;
  author?: Author | null;
};

export type ReportTarget = 'board' | 'challenge' | 'comment' | 'checkin' | 'profile';

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
};

export const AUTHOR_FIELDS = 'id, username, display_name, avatar_path';
