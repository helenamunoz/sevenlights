-- Policy and trigger checks. Run by run.sh against a throwaway Postgres.
-- Every assertion raises on failure, so reaching the end means all passed.
\set ON_ERROR_STOP on

create function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u)::text, true);
end $$;
grant execute on function pg_temp.as_user(uuid) to authenticated;

create function pg_temp.expect_fail(q text, label text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    return;
  end;
  raise exception 'expected failure: %', label;
end $$;
create function pg_temp.expect(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'assertion failed: %', label; end if;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@test'),
  ('00000000-0000-0000-0000-00000000000b', 'bea@test'),
  ('00000000-0000-0000-0000-00000000000c', 'cam@test');
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
insert into app_admins values (:C);

-- profiles and the seven boards
begin; select pg_temp.as_user(:A);
insert into profiles (id, username, display_name) values (:A, 'ana', 'Ana');
select pg_temp.expect((select count(*) from boards where owner_id = :A) = 7, 'seven chakra boards');
select pg_temp.expect_fail($$insert into profiles (id, username, display_name) values ('00000000-0000-0000-0000-00000000000b', 'x_y', 'X')$$, 'profile for someone else');
commit;
begin; select pg_temp.as_user(:B);
insert into profiles (id, username, display_name) values (:B, 'bea', 'Bea'); commit;
begin; select pg_temp.as_user(:C);
insert into profiles (id, username, display_name) values (:C, 'cam', 'Cam'); commit;
begin; select pg_temp.as_user(:B);
select pg_temp.expect_fail($$insert into profiles (id, username, display_name) values ('00000000-0000-0000-0000-00000000000b', 'Bad Name', 'X')$$, 'username format');
select pg_temp.expect_fail($$insert into app_admins values ('00000000-0000-0000-0000-00000000000b')$$, 'self-admin');
rollback;

-- boards: private stays private, counters and hidden flags are out of reach
begin; select pg_temp.as_user(:A);
update boards set intention = 'calma', is_public = false where owner_id = :A and chakra = 'anahata';
update boards set intention = 'voz' where owner_id = :A and chakra = 'vishuddha';
insert into board_images (board_id, owner_id, storage_path)
  select id, :A, '00000000-0000-0000-0000-00000000000a/boards/x/private.jpg' from boards where owner_id = :A and chakra = 'anahata';
insert into board_images (board_id, owner_id, storage_path)
  select id, :A, '00000000-0000-0000-0000-00000000000a/boards/x/public.jpg' from boards where owner_id = :A and chakra = 'vishuddha';
select pg_temp.expect((select image_count from boards where owner_id = :A and chakra = 'vishuddha') = 1, 'image_count');
select pg_temp.expect_fail($$update boards set like_count = 99$$, 'forge like_count');
select pg_temp.expect_fail($$update boards set hidden_at = null$$, 'touch hidden_at');
select pg_temp.expect_fail($$insert into boards (owner_id, chakra) values ('00000000-0000-0000-0000-00000000000a', 'ajna')$$, 'insert chakra board');
select pg_temp.expect_fail($$insert into board_images (board_id, owner_id, storage_path) select id, '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b/boards/x/y.jpg' from boards limit 1$$, 'image path outside own folder');
commit;

begin; select pg_temp.as_user(:B);
select pg_temp.expect((select count(*) from boards where owner_id = :A) = 6, 'private board invisible');
select pg_temp.expect((select count(*) from board_images where owner_id = :A) = 1, 'private image invisible');
select pg_temp.expect(public.can_read_media('00000000-0000-0000-0000-00000000000a/boards/x/public.jpg'), 'public media readable');
select pg_temp.expect(not public.can_read_media('00000000-0000-0000-0000-00000000000a/boards/x/private.jpg'), 'private media unreadable');
update boards set intention = 'hack' where owner_id = :A;
select pg_temp.expect((select count(*) from boards where intention = 'hack') = 0, 'cannot edit others boards');
select pg_temp.expect_fail($$insert into board_images (board_id, owner_id, storage_path) select id, '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b/boards/x/z.jpg' from boards where owner_id = '00000000-0000-0000-0000-00000000000a' limit 1$$, 'image onto someone else''s board');
insert into board_likes (board_id, user_id) select id, :B from boards where owner_id = :A and chakra = 'vishuddha';
select pg_temp.expect((select like_count from boards where owner_id = :A and chakra = 'vishuddha') = 1, 'like_count');
select pg_temp.expect_fail($$insert into board_likes (board_id, user_id) select id, '00000000-0000-0000-0000-00000000000a' from boards limit 1$$, 'like as someone else');
-- copy a board
select public.copy_board((select id from boards where owner_id = :A and chakra = 'vishuddha'), 'De Ana');
select pg_temp.expect((select intention from boards where owner_id = :B and title = 'De Ana') = 'voz', 'copy_board');
select pg_temp.expect((select count(*) from boards where owner_id = :B and chakra is null) = 1, 'copy is a free board of mine');
commit;
begin; select pg_temp.as_user(:B);
select pg_temp.expect_fail(format($$select public.copy_board(%L, 'x')$$, (select id from boards where owner_id = '00000000-0000-0000-0000-00000000000a' and chakra = 'anahata')), 'copy private board');
rollback;

-- blocks hide people from each other, both ways
begin; select pg_temp.as_user(:A);
insert into blocks (blocker_id, blocked_id) values (:A, :B); commit;
begin; select pg_temp.as_user(:B);
select pg_temp.expect((select count(*) from boards where owner_id = :A) = 0, 'blocked: boards hidden');
select pg_temp.expect((select count(*) from profiles where id = :A) = 0, 'blocked: profile hidden');
select pg_temp.expect(not public.can_read_media('00000000-0000-0000-0000-00000000000a/boards/x/public.jpg'), 'blocked: media hidden');
commit;
begin; select pg_temp.as_user(:A);
select pg_temp.expect((select count(*) from boards where owner_id = :B) = 0, 'blocker: boards hidden');
delete from blocks where blocker_id = :A; commit;

-- challenges, days and check-ins
begin; select pg_temp.as_user(:A);
insert into challenges (creator_id, title, duration_days, missed_rule) values
  (:A, 'Calendario', 5, 'calendar'), (:A, 'A tu ritmo', 3, 'any_pace'), (:A, 'Estricto', 3, 'strict');
insert into challenge_days (challenge_id, day_number, body) select id, 1, 'hola' from challenges where title = 'Calendario';
select pg_temp.expect_fail($$insert into challenge_days (challenge_id, day_number) select id, 6 from challenges where title = 'Calendario'$$, 'day beyond duration');
select pg_temp.expect_fail($$insert into challenges (creator_id, title, duration_days, is_official) values ('00000000-0000-0000-0000-00000000000a', 'Oficial', 3, true)$$, 'self-official');
select pg_temp.expect_fail($$update challenges set rank = 1$$, 'forge rank');
select pg_temp.expect_fail($$insert into challenges (creator_id, title, duration_days, link_url) values ('00000000-0000-0000-0000-00000000000a', 'Link', 3, 'javascript:alert(1)')$$, 'non-https link');
commit;

begin; select pg_temp.as_user(:B);
select pg_temp.expect_fail($$insert into challenge_days (challenge_id, day_number) select id, 2 from challenges where title = 'Calendario'$$, 'days on someone else''s challenge');
select pg_temp.expect_fail($$insert into challenge_members (challenge_id, user_id, start_date) select id, '00000000-0000-0000-0000-00000000000b', current_date - 10 from challenges where title = 'Calendario'$$, 'backdated join');
insert into challenge_members (challenge_id, user_id, start_date) select id, :B, (now() at time zone 'utc')::date - 1 from challenges;
select pg_temp.expect((select member_count from challenges where title = 'Calendario') = 1, 'member_count');
commit;

\set TODAY '(now() at time zone ''utc'')::date'
begin; select pg_temp.as_user(:B);
-- calendar: joined yesterday, so today is day 2. Days 1 and 2 are open, 3 is not.
select pg_temp.expect_fail($$insert into checkins (challenge_id, user_id, day_number, local_date) select id, '00000000-0000-0000-0000-00000000000b', 3, (now() at time zone 'utc')::date from challenges where title = 'Calendario'$$, 'future day');
insert into checkins (challenge_id, user_id, day_number, local_date, note) select id, :B, 2, :TODAY, 'me hizo bien' from challenges where title = 'Calendario';
insert into checkins (challenge_id, user_id, day_number, local_date, note, note_public) select id, :B, 1, :TODAY, 'secreto', false from challenges where title = 'Calendario';
select pg_temp.expect_fail($$insert into checkins (challenge_id, user_id, day_number, local_date) select id, '00000000-0000-0000-0000-00000000000b', 2, (now() at time zone 'utc')::date from challenges where title = 'Calendario'$$, 'same day twice');
-- any pace: in order, one a day
select pg_temp.expect_fail($$insert into checkins (challenge_id, user_id, day_number, local_date) select id, '00000000-0000-0000-0000-00000000000b', 2, (now() at time zone 'utc')::date from challenges where title = 'A tu ritmo'$$, 'any_pace out of order');
insert into checkins (challenge_id, user_id, day_number, local_date) select id, :B, 1, :TODAY from challenges where title = 'A tu ritmo';
select pg_temp.expect_fail($$insert into checkins (challenge_id, user_id, day_number, local_date) select id, '00000000-0000-0000-0000-00000000000b', 2, (now() at time zone 'utc')::date from challenges where title = 'A tu ritmo'$$, 'any_pace twice in a day');
-- strict: yesterday (day 1) was missed, so day 2 is refused until a restart
select pg_temp.expect_fail($$insert into checkins (challenge_id, user_id, day_number, local_date) select id, '00000000-0000-0000-0000-00000000000b', 2, (now() at time zone 'utc')::date from challenges where title = 'Estricto'$$, 'strict after a miss');
select public.restart_challenge((select id from challenges where title = 'Estricto'), :TODAY);
insert into checkins (challenge_id, user_id, day_number, local_date) select id, :B, 1, :TODAY from challenges where title = 'Estricto';
select pg_temp.expect((select restarts from challenge_members m join challenges c on c.id = m.challenge_id where c.title = 'Estricto') = 1, 'restart counted');
select pg_temp.expect_fail($$insert into checkins (challenge_id, user_id, day_number, local_date) select id, '00000000-0000-0000-0000-00000000000a', 1, (now() at time zone 'utc')::date from challenges where title = 'Calendario'$$, 'check-in for a non-member');
-- votes and comments
insert into challenge_votes (challenge_id, user_id, value) select id, :B, 1 from challenges where title = 'Calendario';
insert into challenge_votes (challenge_id, user_id, value) select id, :B, -1 from challenges where title = 'Estricto';
insert into comments (challenge_id, user_id, body) select id, :B, 'gracias' from challenges where title = 'Calendario';
select pg_temp.expect((select up_count = 1 and rank > 0.2 from challenges where title = 'Calendario'), 'vote raises rank');
select pg_temp.expect((select down_count = 1 and rank < 0.001 from challenges where title = 'Estricto'), 'downvote counted');
select pg_temp.expect((select comment_count from challenges where title = 'Calendario') = 1, 'comment_count');
select pg_temp.expect_fail($$insert into challenge_votes (challenge_id, user_id, value) select id, '00000000-0000-0000-0000-00000000000b', 5 from challenges where title = 'A tu ritmo'$$, 'vote value');
insert into reports (reporter_id, target_type, target_id) select :B, 'challenge', id from challenges where title = 'Estricto';
commit;

begin; select pg_temp.as_user(:A);
select pg_temp.expect((select count(*) from checkins) = 1, 'only the shared note is visible to others');
select pg_temp.expect((select count(*) from reports) = 0, 'reports are not public');
select pg_temp.expect_fail($$select public.admin_set_hidden('comment', (select id from comments limit 1), true)$$, 'hide without being admin');
delete from challenges where title = 'Calendario';
select pg_temp.expect((select count(*) from challenges where title = 'Calendario') = 1, 'cannot delete a joined challenge');
commit;

-- admin
begin; select pg_temp.as_user(:C);
select pg_temp.expect((select count(*) from reports where resolved_at is null) = 1, 'admin sees reports');
select public.admin_set_hidden('challenge', (select id from challenges where title = 'Estricto'), true);
select public.admin_set_hidden('comment', (select id from comments limit 1), true);
select pg_temp.expect((select count(*) from reports where resolved_at is null) = 0, 'report resolved');
commit;
begin; select pg_temp.as_user(:B);
select pg_temp.expect((select count(*) from challenges where title = 'Estricto') = 0, 'hidden challenge gone for others');
select pg_temp.expect((select count(*) from comments) = 1, 'author still sees own hidden comment');
commit;
begin; select pg_temp.as_user(:A);
select pg_temp.expect((select count(*) from challenges where title = 'Estricto') = 1, 'creator still sees own hidden challenge');
select pg_temp.expect((select count(*) from comments) = 0, 'hidden comment gone for others');
commit;

-- storage policies
begin; select pg_temp.as_user(:B);
insert into storage.objects (bucket_id, name) values ('media', '00000000-0000-0000-0000-00000000000b/boards/x/z.jpg');
select pg_temp.expect_fail($$insert into storage.objects (bucket_id, name) values ('media', '00000000-0000-0000-0000-00000000000a/boards/x/z.jpg')$$, 'upload into another folder');
commit;
reset role;
insert into storage.objects (bucket_id, name) values
  ('media', '00000000-0000-0000-0000-00000000000a/boards/x/private.jpg'),
  ('media', '00000000-0000-0000-0000-00000000000a/boards/x/public.jpg');
begin; select pg_temp.as_user(:B);
select pg_temp.expect((select count(*) from storage.objects where name like '%a/boards/%') = 1, 'storage: only the public photo');
commit;

-- account deletion: content goes, the challenge and its members stay
begin; select pg_temp.as_user(:A); select public.delete_my_account(); commit;
reset role;
select pg_temp.expect((select count(*) from profiles where id = :A) = 0, 'profile deleted');
select pg_temp.expect((select count(*) from boards where owner_id = :A) = 0, 'boards deleted');
select pg_temp.expect((select count(*) from challenges where title = 'Calendario' and creator_id is null) = 1, 'challenge outlives its creator');
select pg_temp.expect((select count(*) from checkins) >= 3, 'members keep their progress');

-- seed loads
\i ../seed.sql
select pg_temp.expect((select count(*) from challenges where is_official) = 2, 'seed challenges');
select pg_temp.expect((select count(*) from challenge_days d join challenges c on c.id = d.challenge_id where c.is_official) = 8, 'seed days');
\echo ALL RLS CHECKS PASSED
