export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attachments: {
        Row: {
          id: string
          file_path: string
          file_name: string
          file_type: string
          file_size: number
          created_at: string
          post_id: string | null
          comment_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          file_path: string
          file_name: string
          file_type: string
          file_size: number
          created_at?: string
          post_id?: string | null
          comment_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          file_path?: string
          file_name?: string
          file_type?: string
          file_size?: number
          created_at?: string
          post_id?: string | null
          comment_id?: string | null
          user_id?: string
        }
      }
      comments: {
        Row: {
          id: string
          content: Json
          created_at: string
          updated_at: string
          user_id: string
          post_id: string
        }
        Insert: {
          id?: string
          content?: Json
          created_at?: string
          updated_at?: string
          user_id: string
          post_id: string
        }
        Update: {
          id?: string
          content?: Json
          created_at?: string
          updated_at?: string
          user_id?: string
          post_id?: string
        }
      }
      posts: {
        Row: {
          id: string
          title: string
          content: Json
          excerpt: string | null
          slug: string | null
          published: boolean | null
          created_at: string
          updated_at: string
          user_id: string
          cover_image: string | null
        }
        Insert: {
          id?: string
          title: string
          content?: Json
          excerpt?: string | null
          slug?: string | null
          published?: boolean | null
          created_at?: string
          updated_at?: string
          user_id: string
          cover_image?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: Json
          excerpt?: string | null
          slug?: string | null
          published?: boolean | null
          created_at?: string
          updated_at?: string
          user_id?: string
          cover_image?: string | null
        }
      }
      profile_posts: {
        Row: {
          id: string
          profile_id: string
          post_id: string
          type: 'favorite' | 'bookmark' | 'read'
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          post_id: string
          type: 'favorite' | 'bookmark' | 'read'
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          post_id?: string
          type?: 'favorite' | 'bookmark' | 'read'
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}