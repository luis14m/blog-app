- Create profile_posts table
CREATE TABLE IF NOT EXISTS public.profile_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(profile_id, post_id)
);

-- Enable RLS
ALTER TABLE profile_posts ENABLE ROW LEVEL SECURITY;

-- Policies for profile_posts
CREATE POLICY "Users can manage their own profile_posts"
  ON profile_posts
  USING (auth.uid() = profile_id);

CREATE POLICY "Public can view profile_posts counts"
  ON profile_posts
  FOR SELECT
  USING (true);

-- Create indexes for better performance
CREATE INDEX profile_posts_profile_id_idx ON profile_posts(profile_id);
CREATE INDEX profile_posts_post_id_idx ON profile_posts(post_id);
CREATE INDEX profile_posts_created_at_idx ON profile_posts(created_at);
CREATE INDEX profile_posts_profile_post_idx ON profile_posts(profile_id, post_id);