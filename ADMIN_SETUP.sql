-- CLASSIC EVENTS CONNECT — ADMIN SETUP
-- Administrator: Munguci Amos
-- Email: munguciamos85@gmail.com
--
-- FIRST: Create this email as a user in Supabase -> Authentication -> Users.
-- Set the password there. Do NOT put the password in this file or in website code.
-- THEN: run this SQL in Supabase SQL Editor.

do $$
declare
  admin_id uuid;
begin
  select id into admin_id
  from auth.users
  where lower(email) = lower('munguciamos85@gmail.com')
  limit 1;

  if admin_id is null then
    raise exception 'Administrator account not found. Create munguciamos85@gmail.com in Supabase Authentication -> Users first.';
  end if;

  insert into public.user_roles(user_id, role)
  values (admin_id, 'admin')
  on conflict (user_id) do update set role = 'admin';

  -- Keep the administrator profile recognizable if the profiles table exists.
  insert into public.profiles(id, name, contact, type)
  values (admin_id, 'Munguci Amos', 'munguciamos85@gmail.com', 'Administrator')
  on conflict (id) do update
    set name = excluded.name, contact = excluded.contact, type = excluded.type;
end $$;

-- After running this, sign in at the website's Admin section.
