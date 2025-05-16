-- Create enum for user roles if it doesn't exist
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('user', 'admin');
  end if;
end $$;

-- Add role to profiles if it doesn't exist
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'role'
  ) then
    alter table public.profiles add column role user_role not null default 'user';
  end if;
end $$;

-- Create RLS policies for posts
alter table public.posts enable row level security;

create policy "Admins can do anything"
on public.posts
as permissive
for all
to authenticated
using (exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
));

create policy "Users can read all posts"
on public.posts
as permissive
for select
to authenticated
using (true);

create policy "Users can update own posts"
on public.posts
as permissive
for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete own posts"
on public.posts
as permissive
for delete
to authenticated
using (auth.uid() = user_id);

-- Create RLS policies for comments
alter table public.comments enable row level security;

create policy "Admins can do anything with comments"
on public.comments
as permissive
for all
to authenticated
using (exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
));

create policy "Users can read all comments"
on public.comments
as permissive
for select
to authenticated
using (true);

create policy "Users can update own comments"
on public.comments
as permissive
for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete own comments"
on public.comments
as permissive
for delete
to authenticated
using (auth.uid() = user_id);

-- Function to set admin role
create or replace function public.set_admin_role(user_email text)
returns void
language plpgsql
security definer
as $$
declare
  user_id uuid;
begin
  -- Get the user id from auth.users
  select id into user_id
  from auth.users
  where email = user_email;

  -- Update the role in profiles table
  update public.profiles
  set role = 'admin'
  where id = user_id;
end;
$$;
