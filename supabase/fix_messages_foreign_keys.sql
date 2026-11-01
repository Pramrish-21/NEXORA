-- =========================================================================
-- NEXORA - Messaging Foreign Key & Profile Synchronization Fix
-- Idempotent & Non-Destructive Migration
-- =========================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENSURE PROFILES TABLE STRUCTURE & CONSTRAINTS
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies (Idempotent)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. ROBUST AUTOMATED PROFILE CREATION TRIGGER ON auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  candidate_username text;
  suffix int := 0;
BEGIN
  -- Extract username from metadata or email prefix or user id
  base_username := COALESCE(
    NULLIF(REGEXP_REPLACE(LOWER(TRIM(new.raw_user_meta_data->>'username')), '[^a-z0-9_]', '', 'g'), ''),
    NULLIF(REGEXP_REPLACE(LOWER(SPLIT_PART(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
    'user_' || SUBSTR(REPLACE(new.id::text, '-', ''), 1, 8)
  );

  -- Ensure minimum 3 characters
  IF length(base_username) < 3 THEN
    base_username := base_username || '_' || SUBSTR(REPLACE(new.id::text, '-', ''), 1, 4);
  END IF;

  -- Resolve collision if username is taken by another account
  candidate_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate_username AND id <> new.id) LOOP
    suffix := suffix + 1;
    candidate_username := base_username || suffix::text;
  END LOOP;

  -- Insert or update public.profiles idempotently
  INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, created_at)
  VALUES (
    new.id,
    candidate_username,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(
      new.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/identicon/svg?seed=' || candidate_username
    ),
    COALESCE(new.raw_user_meta_data->>'bio', 'NEXORA Member.'),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. BACKFILL: Provision profiles for any existing auth.users without a profile
INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, created_at)
SELECT
  u.id,
  COALESCE(
    NULLIF(REGEXP_REPLACE(LOWER(TRIM(u.raw_user_meta_data->>'username')), '[^a-z0-9_]', '', 'g'), ''),
    NULLIF(REGEXP_REPLACE(LOWER(SPLIT_PART(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
    'user_' || SUBSTR(REPLACE(u.id::text, '-', ''), 1, 8)
  ) || CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p2 
      WHERE p2.username = COALESCE(
        NULLIF(REGEXP_REPLACE(LOWER(TRIM(u.raw_user_meta_data->>'username')), '[^a-z0-9_]', '', 'g'), ''),
        NULLIF(REGEXP_REPLACE(LOWER(SPLIT_PART(u.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
        'user_' || SUBSTR(REPLACE(u.id::text, '-', ''), 1, 8)
      ) AND p2.id <> u.id
    ) THEN '_' || SUBSTR(REPLACE(u.id::text, '-', ''), 1, 4)
    ELSE ''
  END AS username,
  COALESCE(u.raw_user_meta_data->>'full_name', '') AS full_name,
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    'https://api.dicebear.com/7.x/identicon/svg?seed=' || u.id::text
  ) AS avatar_url,
  'NEXORA Member.' AS bio,
  COALESCE(u.created_at, timezone('utc'::text, now())) AS created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 5. ENSURE MESSAGES TABLE STRUCTURE & FOREIGN KEYS
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  read_at timestamp with time zone
);

-- Ensure Foreign Key Constraints Point to public.profiles(id)
DO $$
BEGIN
  -- Add foreign key for sender_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_id_fkey
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for receiver_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_receiver_id_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_receiver_id_fkey
      FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. STRICT ROW LEVEL SECURITY ON MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
CREATE POLICY "Users can read own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert messages as sender" ON public.messages;
CREATE POLICY "Users can insert messages as sender" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 7. ENABLE REALTIME ON MESSAGES
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
