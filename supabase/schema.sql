-- SevenLights — database schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query),
-- then run seed.sql. It is written for a fresh project.
--
-- The model: everyone signs in. Boards are public unless their owner switches
-- them to private; challenges, comments and shared notes are public. Row level
-- security below is what keeps private things private, hides what an admin has
-- hidden, and keeps blocked people out of each other's sight. Counters, ranks
-- and hidden flags are only ever written by triggers and admin functions:
-- clients get column-level grants, never a blanket UPDATE.

create extension if not exists citext;

-- ───────────────────────────── people ─────────────────────────────

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     citext not null unique
               check (username ~ '^[a-z0-9_]{3,20}$'
                      and username not in ('admin', 'sevenlights', 'siete_luces', 'support', 'soporte')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio          text not null default '' check (char_length(bio) <= 200),
  avatar_path  text,
  locale       text not null default 'es' check (locale in ('es', 'en')),
  created_at   timestamptz not null default now()
);

-- Admins live in their own table with no client access at all, so nobody can
-- promote themselves. Add a row by hand in the SQL editor.
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_reverse_idx on public.blocks (blocked_id, blocker_id);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_admins where user_id = auth.uid());
$$;

-- True when either person has blocked the other.
create function public.is_blocked(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$$;

-- ───────────────────────────── boards ─────────────────────────────

-- One row is one page. Seven of them per person carry a chakra and are created
-- with the profile; any others are free boards with a title and a chosen light.
create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  chakra      text check (chakra in ('muladhara', 'svadhisthana', 'manipura', 'anahata',
                                     'vishuddha', 'ajna', 'sahasrara')),
  title       text not null default '' check (char_length(title) <= 60),
  light       text not null default 'sahasrara'
              check (light in ('muladhara', 'svadhisthana', 'manipura', 'anahata',
                               'vishuddha', 'ajna', 'sahasrara')),
  intention   text not null default '' check (char_length(intention) <= 600),
  affirmation text not null default '' check (char_length(affirmation) <= 600),
  words       text[] not null default '{}' check (cardinality(words) <= 24),
  is_public   boolean not null default true,
  hidden_at   timestamptz,
  like_count  integer not null default 0,
  image_count integer not null default 0,
  -- Explore only lists boards with something on them; everyone starts with
  -- seven empty ones.
  has_content boolean generated always as
              (image_count > 0 or intention <> '' or affirmation <> '') stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index boards_owner_chakra_idx on public.boards (owner_id, chakra) where chakra is not null;
create index boards_owner_idx on public.boards (owner_id);
create index boards_explore_idx on public.boards (like_count desc, updated_at desc)
  where is_public and hidden_at is null and has_content;

create table public.board_images (
  id              uuid primary key default gen_random_uuid(),
  board_id        uuid not null references public.boards (id) on delete cascade,
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  storage_path    text not null unique,
  caption         text not null default '' check (char_length(caption) <= 200),
  position        integer not null default 0,
  -- Where a borrowed photo came from, for credit. Survives the source going away.
  source_image_id uuid,
  source_owner_id uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index board_images_board_idx on public.board_images (board_id, position, created_at);

create table public.board_likes (
  board_id   uuid not null references public.boards (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger boards_touch before update of title, light, intention, affirmation, words, is_public
  on public.boards for each row execute function public.touch_updated_at();

create function public.create_chakra_boards() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into boards (owner_id, chakra, light)
  select new.id, c, c
  from unnest(array['muladhara', 'svadhisthana', 'manipura', 'anahata',
                    'vishuddha', 'ajna', 'sahasrara']) as c;
  return new;
end $$;
create trigger profiles_create_boards after insert on public.profiles
  for each row execute function public.create_chakra_boards();

create function public.count_board_images() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if (select image_count from boards where id = new.board_id) >= 60 then
      raise exception 'board_full';
    end if;
    update boards set image_count = image_count + 1, updated_at = now() where id = new.board_id;
  else
    update boards set image_count = greatest(image_count - 1, 0) where id = old.board_id;
  end if;
  return null;
end $$;
create trigger board_images_count after insert or delete on public.board_images
  for each row execute function public.count_board_images();

create function public.count_board_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update boards set like_count = like_count + 1 where id = new.board_id;
  else
    update boards set like_count = greatest(like_count - 1, 0) where id = old.board_id;
  end if;
  return null;
end $$;
create trigger board_likes_count after insert or delete on public.board_likes
  for each row execute function public.count_board_likes();

-- ──────────────────────────── challenges ────────────────────────────

create table public.challenges (
  id            uuid primary key default gen_random_uuid(),
  -- Null once the creator deletes their account; members keep their progress.
  creator_id    uuid references public.profiles (id) on delete set null,
  is_official   boolean not null default false,
  title         text not null check (char_length(title) between 3 and 80),
  description   text not null default '' check (char_length(description) <= 1200),
  duration_days integer not null check (duration_days between 1 and 365),
  locale        text not null default 'es' check (locale in ('es', 'en')),
  -- calendar: ends N days after joining, missed days stay empty.
  -- any_pace: complete when N days are ticked, one per day at most.
  -- strict:   a missed day means starting over from day 1.
  missed_rule   text not null default 'calendar' check (missed_rule in ('calendar', 'any_pace', 'strict')),
  light         text not null default 'anahata'
                check (light in ('muladhara', 'svadhisthana', 'manipura', 'anahata',
                                 'vishuddha', 'ajna', 'sahasrara')),
  -- Defaults for every day; challenge_days can override them per day.
  timer_seconds integer check (timer_seconds between 10 and 7200),
  audio_path    text,
  link_url      text check (link_url ~ '^https://' and char_length(link_url) <= 500),
  up_count      integer not null default 0,
  down_count    integer not null default 0,
  rank          double precision not null default 0,
  member_count  integer not null default 0,
  comment_count integer not null default 0,
  hidden_at     timestamptz,
  created_at    timestamptz not null default now()
);
create index challenges_rank_idx on public.challenges (locale, rank desc, member_count desc, created_at desc)
  where hidden_at is null;

create table public.challenge_days (
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  day_number    integer not null check (day_number >= 1),
  body          text not null default '' check (char_length(body) <= 1200),
  timer_seconds integer check (timer_seconds between 10 and 7200),
  audio_path    text,
  link_url      text check (link_url ~ '^https://' and char_length(link_url) <= 500),
  primary key (challenge_id, day_number)
);

create table public.challenge_members (
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  -- The member's own calendar date on the day they joined: day 1.
  start_date    date not null,
  reminder_time time,
  restarts      integer not null default 0,
  joined_at     timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index challenge_members_user_idx on public.challenge_members (user_id);

create table public.checkins (
  id           uuid not null default gen_random_uuid() unique,
  challenge_id uuid not null,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  day_number   integer not null,
  -- The member's calendar date when they ticked the day.
  local_date   date not null,
  note         text not null default '' check (char_length(note) <= 1000),
  note_public  boolean not null default true,
  hidden_at    timestamptz,
  done_at      timestamptz not null default now(),
  primary key (challenge_id, user_id, day_number),
  foreign key (challenge_id, user_id)
    references public.challenge_members (challenge_id, user_id) on delete cascade
);
create index checkins_notes_idx on public.checkins (challenge_id, done_at desc)
  where note_public and note <> '' and hidden_at is null;

create table public.challenge_votes (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  value        smallint not null check (value in (-1, 1)),
  primary key (challenge_id, user_id)
);

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  hidden_at    timestamptz,
  created_at   timestamptz not null default now()
);
create index comments_challenge_idx on public.comments (challenge_id, created_at desc);

-- Lower bound of the Wilson score interval (95%). Unlike up-minus-down it does
-- not let an old challenge with many votes sit on top forever, and a new one
-- with a few good votes can climb.
create function public.wilson(up integer, down integer) returns double precision
language sql immutable as $$
  select case when up + down = 0 then 0 else
    ((up::float / (up + down)) + 3.8416 / (2 * (up + down))
      - 1.96 * sqrt(((up::float / (up + down)) * (1 - up::float / (up + down))
                     + 3.8416 / (4 * (up + down))) / (up + down)))
    / (1 + 3.8416 / (up + down))
  end;
$$;

create function public.count_votes() returns trigger
language plpgsql security definer set search_path = public as $$
declare target uuid := coalesce(new.challenge_id, old.challenge_id);
begin
  update challenges c set
    up_count = v.up, down_count = v.down, rank = wilson(v.up, v.down)
  from (
    select count(*) filter (where value = 1)::int as up,
           count(*) filter (where value = -1)::int as down
    from challenge_votes where challenge_id = target
  ) v
  where c.id = target;
  return null;
end $$;
create trigger challenge_votes_count after insert or update or delete on public.challenge_votes
  for each row execute function public.count_votes();

create function public.count_members() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update challenges set member_count = member_count + 1 where id = new.challenge_id;
  else
    update challenges set member_count = greatest(member_count - 1, 0) where id = old.challenge_id;
  end if;
  return null;
end $$;
create trigger challenge_members_count after insert or delete on public.challenge_members
  for each row execute function public.count_members();

create function public.count_comments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update challenges set comment_count = comment_count + 1 where id = new.challenge_id;
  else
    update challenges set comment_count = greatest(comment_count - 1, 0) where id = old.challenge_id;
  end if;
  return null;
end $$;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.count_comments();

-- Posting limits, so one account cannot flood the lists.
create function public.limit_challenges() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from challenges
      where creator_id = new.creator_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many_challenges';
  end if;
  return new;
end $$;
create trigger challenges_limit before insert on public.challenges
  for each row when (new.creator_id is not null) execute function public.limit_challenges();

create function public.limit_comments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from comments
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 100 then
    raise exception 'too_many_comments';
  end if;
  return new;
end $$;
create trigger comments_limit before insert on public.comments
  for each row execute function public.limit_comments();

create function public.check_challenge_day() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.day_number > (select duration_days from challenges where id = new.challenge_id) then
    raise exception 'day_out_of_range';
  end if;
  return new;
end $$;
create trigger challenge_days_check before insert or update on public.challenge_days
  for each row execute function public.check_challenge_day();

create function public.check_member() returns trigger
language plpgsql as $$
begin
  -- The client sends its own calendar date; it can only be a day either side
  -- of the server's, which covers every time zone.
  if new.start_date not between (now() at time zone 'utc')::date - 1
                            and (now() at time zone 'utc')::date + 1 then
    raise exception 'bad_start_date';
  end if;
  return new;
end $$;
create trigger challenge_members_check before insert on public.challenge_members
  for each row execute function public.check_member();

-- A check-in has to be for a day the member has actually reached, under the
-- rule the challenge creator chose.
create function public.check_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c record;
  m record;
  today date := (now() at time zone 'utc')::date;
  done integer;
begin
  select * into m from challenge_members
    where challenge_id = new.challenge_id and user_id = new.user_id;
  select * into c from challenges where id = new.challenge_id;
  if m is null or c is null then raise exception 'not_a_member'; end if;

  if new.local_date not between today - 1 and today + 1 then
    raise exception 'bad_local_date';
  end if;
  if new.day_number < 1 or new.day_number > c.duration_days then
    raise exception 'day_out_of_range';
  end if;

  if c.missed_rule = 'any_pace' then
    select count(*) into done from checkins
      where challenge_id = new.challenge_id and user_id = new.user_id;
    if new.day_number <> done + 1 then raise exception 'day_out_of_order'; end if;
    if exists (select 1 from checkins
               where challenge_id = new.challenge_id and user_id = new.user_id
                 and local_date = new.local_date) then
      raise exception 'already_done_today';
    end if;
  else
    -- Day n falls on start_date + n - 1 in the member's calendar.
    if new.day_number > new.local_date - m.start_date + 1 then
      raise exception 'day_in_future';
    end if;
    if c.missed_rule = 'calendar' and new.day_number < new.local_date - m.start_date then
      raise exception 'day_too_old';
    end if;
    if c.missed_rule = 'strict' then
      if new.day_number <> new.local_date - m.start_date + 1 then
        raise exception 'day_too_old';
      end if;
      if new.day_number > 1 and not exists (
        select 1 from checkins
        where challenge_id = new.challenge_id and user_id = new.user_id
          and day_number = new.day_number - 1) then
        raise exception 'streak_broken';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger checkins_check before insert on public.checkins
  for each row execute function public.check_checkin();

-- ──────────────────────────── moderation ────────────────────────────

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('board', 'challenge', 'comment', 'checkin', 'profile')),
  target_id   uuid not null,
  reason      text not null default '' check (char_length(reason) <= 500),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reporter_id, target_type, target_id)
);

create function public.admin_set_hidden(p_type text, p_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
declare stamp timestamptz := case when p_hidden then now() end;
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  case p_type
    when 'board'     then update boards     set hidden_at = stamp where id = p_id;
    when 'challenge' then update challenges set hidden_at = stamp where id = p_id;
    when 'comment'   then update comments   set hidden_at = stamp where id = p_id;
    when 'checkin'   then update checkins   set hidden_at = stamp where id = p_id;
    -- Hiding a person hides everything they have published.
    when 'profile'   then
      update boards     set hidden_at = stamp where owner_id = p_id;
      update challenges set hidden_at = stamp where creator_id = p_id;
      update comments   set hidden_at = stamp where user_id = p_id;
      update checkins   set hidden_at = stamp where user_id = p_id;
    else raise exception 'bad_type';
  end case;
  update reports set resolved_at = now()
    where target_type = p_type and target_id = p_id and resolved_at is null;
end $$;

create function public.admin_dismiss_reports(p_type text, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_admin'; end if;
  update reports set resolved_at = now()
    where target_type = p_type and target_id = p_id and resolved_at is null;
end $$;

-- ───────────────────────────── actions ─────────────────────────────

create function public.has_other_members(p_challenge uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from challenge_members
                 where challenge_id = p_challenge and user_id <> auth.uid());
$$;

-- Start a copy of someone's board as a new free board of your own. Runs with
-- the caller's rights, so row level security decides whether the source can be
-- read. Photos are copied by the app afterwards, one file at a time.
create function public.copy_board(p_source uuid, p_title text) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  src record;
  new_id uuid;
begin
  select * into src from boards where id = p_source;
  if src is null then raise exception 'not_found'; end if;
  insert into boards (owner_id, title, light, intention, affirmation, words)
  values (auth.uid(), left(p_title, 60), src.light, src.intention, src.affirmation, src.words)
  returning id into new_id;
  return new_id;
end $$;

-- The people you have blocked. They are hidden from you everywhere else, so
-- this is the only way to list them and undo it.
create function public.my_blocked() returns table (id uuid, username citext, display_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name
  from blocks b join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

-- Begin a challenge again from day 1, clearing the previous attempt.
create function public.restart_challenge(p_challenge uuid, p_start date) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_start not between (now() at time zone 'utc')::date - 1
                     and (now() at time zone 'utc')::date + 1 then
    raise exception 'bad_start_date';
  end if;
  delete from checkins where challenge_id = p_challenge and user_id = auth.uid();
  update challenge_members set start_date = p_start, restarts = restarts + 1
    where challenge_id = p_challenge and user_id = auth.uid();
end $$;

-- Removes the account and, by cascade, everything it owns. The app deletes the
-- person's stored files first.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ────────────────────── row level security ──────────────────────

alter table public.profiles          enable row level security;
alter table public.app_admins        enable row level security;
alter table public.blocks            enable row level security;
alter table public.boards            enable row level security;
alter table public.board_images      enable row level security;
alter table public.board_likes       enable row level security;
alter table public.challenges        enable row level security;
alter table public.challenge_days    enable row level security;
alter table public.challenge_members enable row level security;
alter table public.checkins          enable row level security;
alter table public.challenge_votes   enable row level security;
alter table public.comments          enable row level security;
alter table public.reports           enable row level security;

-- Supabase grants everything on new tables to the client roles by default.
-- Take that back and hand out only what each table needs.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- profiles
grant select on public.profiles to authenticated;
grant insert (id, username, display_name, bio, avatar_path, locale) on public.profiles to authenticated;
grant update (username, display_name, bio, avatar_path, locale) on public.profiles to authenticated;
create policy "read profiles" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or not public.is_blocked(id));
create policy "create own profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- blocks
grant select, insert, delete on public.blocks to authenticated;
create policy "own blocks" on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

-- boards
grant select, delete on public.boards to authenticated;
grant insert (owner_id, title, light, intention, affirmation, words, is_public) on public.boards to authenticated;
grant update (title, light, intention, affirmation, words, is_public) on public.boards to authenticated;
create policy "read boards" on public.boards for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (is_public and hidden_at is null and not public.is_blocked(owner_id))
    or public.is_admin()
  );
create policy "create free boards" on public.boards for insert to authenticated
  with check (owner_id = (select auth.uid()) and chakra is null);
create policy "edit own boards" on public.boards for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own free boards" on public.boards for delete to authenticated
  using (owner_id = (select auth.uid()) and chakra is null);

-- board_images: visible exactly when their board is (the subquery is itself
-- filtered by the boards policy above).
grant select, delete on public.board_images to authenticated;
grant insert (id, board_id, owner_id, storage_path, caption, position, source_image_id, source_owner_id)
  on public.board_images to authenticated;
grant update (caption, position) on public.board_images to authenticated;
create policy "read images" on public.board_images for select to authenticated
  using (exists (select 1 from public.boards b where b.id = board_id));
create policy "add own images" on public.board_images for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and storage_path like (select auth.uid())::text || '/%'
    and exists (select 1 from public.boards b where b.id = board_id and b.owner_id = (select auth.uid()))
  );
create policy "edit own images" on public.board_images for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own images" on public.board_images for delete to authenticated
  using (owner_id = (select auth.uid()));

-- board_likes
grant select, insert, delete on public.board_likes to authenticated;
create policy "read own likes" on public.board_likes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "like visible boards" on public.board_likes for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.boards b where b.id = board_id));
create policy "unlike" on public.board_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- challenges
grant select, delete on public.challenges to authenticated;
grant insert (creator_id, title, description, duration_days, locale, missed_rule, light,
              timer_seconds, audio_path, link_url) on public.challenges to authenticated;
grant update (title, description, light, timer_seconds, audio_path, link_url)
  on public.challenges to authenticated;
create policy "read challenges" on public.challenges for select to authenticated
  using (
    creator_id = (select auth.uid())
    or (hidden_at is null and (creator_id is null or not public.is_blocked(creator_id)))
    or public.is_admin()
  );
create policy "create challenges" on public.challenges for insert to authenticated
  with check (creator_id = (select auth.uid()));
create policy "edit own challenges" on public.challenges for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
-- Once other people have joined, a challenge is no longer the creator's to remove.
create policy "delete own unjoined challenges" on public.challenges for delete to authenticated
  using (creator_id = (select auth.uid()) and not public.has_other_members(id));

-- challenge_days
grant select, insert, update, delete on public.challenge_days to authenticated;
create policy "read days" on public.challenge_days for select to authenticated
  using (exists (select 1 from public.challenges c where c.id = challenge_id));
create policy "write own days" on public.challenge_days for all to authenticated
  using (exists (select 1 from public.challenges c
                 where c.id = challenge_id and c.creator_id = (select auth.uid())))
  with check (exists (select 1 from public.challenges c
                      where c.id = challenge_id and c.creator_id = (select auth.uid())));

-- challenge_members
grant select, delete on public.challenge_members to authenticated;
grant insert (challenge_id, user_id, start_date, reminder_time) on public.challenge_members to authenticated;
grant update (reminder_time) on public.challenge_members to authenticated;
create policy "read own memberships" on public.challenge_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy "join visible challenges" on public.challenge_members for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.challenges c where c.id = challenge_id));
create policy "edit own membership" on public.challenge_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "leave" on public.challenge_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- checkins: yours always; other people's only as shared notes.
grant select, delete on public.checkins to authenticated;
grant insert (challenge_id, user_id, day_number, local_date, note, note_public) on public.checkins to authenticated;
grant update (note, note_public) on public.checkins to authenticated;
create policy "read checkins" on public.checkins for select to authenticated
  using (
    user_id = (select auth.uid())
    or (note_public and note <> '' and hidden_at is null and not public.is_blocked(user_id))
    or public.is_admin()
  );
create policy "add own checkins" on public.checkins for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "edit own checkins" on public.checkins for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "remove own checkins" on public.checkins for delete to authenticated
  using (user_id = (select auth.uid()));

-- challenge_votes
grant select, insert, update, delete on public.challenge_votes to authenticated;
create policy "read own votes" on public.challenge_votes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "vote on visible challenges" on public.challenge_votes for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.challenges c where c.id = challenge_id));
create policy "change own vote" on public.challenge_votes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "remove own vote" on public.challenge_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- comments
grant select, delete on public.comments to authenticated;
grant insert (challenge_id, user_id, body) on public.comments to authenticated;
create policy "read comments" on public.comments for select to authenticated
  using (
    user_id = (select auth.uid())
    or (hidden_at is null and not public.is_blocked(user_id))
    or public.is_admin()
  );
create policy "comment on visible challenges" on public.comments for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.challenges c where c.id = challenge_id));
create policy "delete own comments" on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- reports: anyone can file one; only admins read them.
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason) on public.reports to authenticated;
create policy "file reports" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy "admins read reports" on public.reports for select to authenticated
  using (public.is_admin() or reporter_id = (select auth.uid()));

-- ───────────────────────────── storage ─────────────────────────────

-- One private bucket. Paths start with the owner's user id:
--   <uid>/boards/<board id>/<image id>.jpg
--   <uid>/avatar/<stamp>.jpg
--   <uid>/audio/<id>.<ext>
-- Private, not public, on purpose: a public bucket would keep serving a photo
-- by URL after its board was made private or hidden.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

create function public.can_read_media(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select case split_part(p_name, '/', 2)
    when 'avatar' then true
    when 'audio'  then true
    when 'boards' then exists (
      select 1 from board_images i join boards b on b.id = i.board_id
      where i.storage_path = p_name
        and b.is_public and b.hidden_at is null and not is_blocked(b.owner_id))
    else false
  end;
$$;
grant execute on function public.can_read_media(text) to authenticated;

create policy "media read" on storage.objects for select to authenticated
  using (bucket_id = 'media'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or public.can_read_media(name)));
create policy "media write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media update own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
