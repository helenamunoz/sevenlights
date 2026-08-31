-- SevenLights — sync schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- Every row belongs to exactly one signed-in user and is invisible to everyone
-- else: the boards hold personal reflections, so row level security is not
-- optional here. The anon key shipped in the app can only ever see what these
-- policies allow.

create table if not exists public.boards (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  chakra      text        not null check (chakra in (
                            'muladhara','svadhisthana','manipura','anahata',
                            'vishuddha','ajna','sahasrara')),
  intention   text        not null default '',
  affirmation text        not null default '',
  words       text[]      not null default '{}',
  updated_at  timestamptz not null default now(),
  primary key (user_id, chakra)
);

create table if not exists public.board_images (
  id           text        primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  chakra       text        not null,
  storage_path text        not null,
  caption      text        not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists board_images_user_chakra_idx
  on public.board_images (user_id, chakra);

alter table public.boards       enable row level security;
alter table public.board_images enable row level security;

drop policy if exists "own boards" on public.boards;
create policy "own boards" on public.boards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own images" on public.board_images;
create policy "own images" on public.board_images
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Photos live in a private bucket; the app reads them through signed URLs.
insert into storage.buckets (id, name, public)
values ('board-images', 'board-images', false)
on conflict (id) do nothing;

-- Storage paths are "<user id>/<chakra>/<image id>.jpg", so the first path
-- segment is the owner check.
drop policy if exists "own image files" on storage.objects;
create policy "own image files" on storage.objects
  for all
  using (bucket_id = 'board-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'board-images' and (storage.foldername(name))[1] = auth.uid()::text);
