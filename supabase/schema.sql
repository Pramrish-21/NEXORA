-- =========================================================
-- NEXORA - Dark Social PostgreSQL Schema & RLS Setup
-- =========================================================

-- 1. EXTENSIONS & STORAGE SETUP
create extension if not exists "uuid-ossp";

-- Storage Buckets for Post Media and Avatars
insert into storage.buckets (id, name, public) 
values ('posts', 'posts', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS: Anyone can read, authenticated users can upload
create policy "Public Access to Post Media" on storage.objects 
  for select using (bucket_id in ('posts', 'avatars'));
create policy "Authenticated Users Can Upload Media" on storage.objects 
  for insert with check (bucket_id in ('posts', 'avatars') and auth.role() = 'authenticated');

-- 2. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text default '',
  avatar_url text default '',
  bio text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint username_length check (char_length(username) >= 3)
);

alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Trigger: Automatically and robustly generate public.profiles row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    nullif(regexp_replace(lower(trim(new.raw_user_meta_data->>'username')), '[^a-z0-9_]', '', 'g'), ''),
    nullif(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
    'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
  );

  if length(base_username) < 3 then
    base_username := base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;

  candidate_username := base_username;
  while exists (select 1 from public.profiles where username = candidate_username and id <> new.id) loop
    suffix := suffix + 1;
    candidate_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, full_name, avatar_url, bio, created_at)
  values (
    new.id,
    candidate_username,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/identicon/svg?seed=' || candidate_username
    ),
    coalesce(new.raw_user_meta_data->>'bio', 'NEXORA Member.'),
    timezone('utc'::text, now())
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. POSTS TABLE
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  caption text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can create their own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can delete their own posts" on public.posts for delete using (auth.uid() = user_id);

-- 4. LIKES TABLE
create table if not exists public.likes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (post_id, user_id)
);

alter table public.likes enable row level security;
create policy "Likes are viewable by everyone" on public.likes for select using (true);
create policy "Authenticated users can like" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.likes for delete using (auth.uid() = user_id);

-- 5. COMMENTS TABLE
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.comments enable row level security;
create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Authenticated users can comment" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete their comments" on public.comments for delete using (auth.uid() = user_id);

-- 6. MESSAGES TABLE (Real-time Internal Messaging)
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_at timestamp with time zone
);

alter table public.messages enable row level security;

-- Strict messaging RLS: Users can ONLY read messages where they are the sender OR receiver
create policy "Users can read own messages" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can insert messages as sender" on public.messages
  for insert with check (auth.uid() = sender_id);

-- Enable Realtime for Messaging
alter table public.messages replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

-- 7. BACKFILL MISSING PROFILES (Ensures foreign keys never fail for pre-existing auth users)
insert into public.profiles (id, username, full_name, avatar_url, bio, created_at)
select
  u.id,
  coalesce(
    nullif(regexp_replace(lower(trim(u.raw_user_meta_data->>'username')), '[^a-z0-9_]', '', 'g'), ''),
    nullif(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
    'user_' || substr(replace(u.id::text, '-', ''), 1, 8)
  ) || case 
    when exists (
      select 1 from public.profiles p2 
      where p2.username = coalesce(
        nullif(regexp_replace(lower(trim(u.raw_user_meta_data->>'username')), '[^a-z0-9_]', '', 'g'), ''),
        nullif(regexp_replace(lower(split_part(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
        'user_' || substr(replace(u.id::text, '-', ''), 1, 8)
      ) and p2.id <> u.id
    ) then '_' || substr(replace(u.id::text, '-', ''), 1, 4)
    else ''
  end as username,
  coalesce(u.raw_user_meta_data->>'full_name', '') as full_name,
  coalesce(
    u.raw_user_meta_data->>'avatar_url',
    'https://api.dicebear.com/7.x/identicon/svg?seed=' || u.id::text
  ) as avatar_url,
  'NEXORA Member.' as bio,
  coalesce(u.created_at, timezone('utc'::text, now())) as created_at
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

