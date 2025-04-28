/*
  # Blog Schema Setup

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `content` (jsonb, for rich text content)
      - `excerpt` (text)
      - `slug` (text, unique)
      - `published` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)
      - `cover_image` (text, for image URL)
    
    - `comments`
      - `id` (uuid, primary key)
      - `content` (jsonb, for rich text content)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)
      - `post_id` (uuid, foreign key to posts)
      
    - `attachments`
      - `id` (uuid, primary key)
      - `file_path` (text, not null)
      - `file_name` (text, not null)
      - `file_type` (text, not null)
      - `file_size` (integer, not null)
      - `created_at` (timestamp)
      - `post_id` (uuid, foreign key to posts, nullable)
      - `comment_id` (uuid, foreign key to comments, nullable)
      - `user_id` (uuid, foreign key to auth.users)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own content
    - Add policies for public access to published posts and comments
*/

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  excerpt text,
  slug text UNIQUE,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cover_image text
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL
);

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT attachment_belongs_to_entity CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Create profiles table with public user info
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Public can view published posts"
  ON posts
  FOR SELECT
  USING (published = true);

CREATE POLICY "Users can manage their own posts"
  ON posts
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Public can view comments"
  ON comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own comments"
  ON comments
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add comments to any post"
  ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Attachments policies
CREATE POLICY "Users can view attachments on published posts"
  ON attachments
  FOR SELECT
  USING (
    (post_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_id AND (posts.published = true OR posts.user_id = auth.uid())
    )) OR
    (comment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM comments WHERE comments.id = comment_id
    )) OR
    (user_id = auth.uid())
  );

CREATE POLICY "Users can manage their own attachments"
  ON attachments
  USING (auth.uid() = user_id);

-- Profiles policies
CREATE POLICY "Public can view profiles"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  USING (auth.uid() = id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create a function to handle user profile creation on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
