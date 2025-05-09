/*
  # Create attachments storage bucket

  1. Storage
    - Create a new bucket called 'attachments'
    - Set bucket to private
    - Enable file size limits
    - Add security policies for access control

  2. Security
    - Allow authenticated users to upload files
    - Allow public access to files in published posts
    - Allow owners to manage their files
*/

-- Enable storage by creating the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

-- Set up security policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  owner = auth.uid()
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  owner = auth.uid()
);

CREATE POLICY "Public can read files from published posts"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'attachments' AND
  (
    -- File is attached to a published post
    EXISTS (
      SELECT 1
      FROM public.attachments a
      JOIN public.posts p ON a.post_id = p.id
      WHERE 
        storage.objects.name = a.file_path AND
        p.published = true
    )
    OR
    -- File is attached to a comment on a published post
    EXISTS (
      SELECT 1
      FROM public.attachments a
      JOIN public.comments c ON a.comment_id = c.id
      JOIN public.posts p ON c.post_id = p.id
      WHERE 
        storage.objects.name = a.file_path AND
        p.published = true
    )
    OR
    -- File owner is requesting access
    owner = auth.uid()
  )
);