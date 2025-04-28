/*
  # Add Profile Posts Relation Table

  1. New Table
    - `profile_posts`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, foreign key to profiles)
      - `post_id` (uuid, foreign key to posts)
      - `type` (text, for relationship type: 'favorite', 'bookmark', 'read')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for users to manage their own relations
    - Add policies for public access to view counts
*/

-- Create profile_posts table
CREATE TABLE IF NOT EXISTS profile_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('favorite', 'bookmark', 'read')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, post_id, type)
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
CREATE INDEX profile_posts_type_idx ON profile_posts(type);